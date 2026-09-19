"""Contract tests only: synthetic reports are not real Codex acceptance evidence."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('codex_acceptance', PROJECT / 'scripts/codex_acceptance.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class ReceiptTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='receipt-unit-', dir=PROJECT / '.runtime')
        self.root = Path(self.temp.name)
        self.root_patch = patch.object(worker, 'ROOT', self.root)
        self.root_patch.start()
        self.runs_patch = patch.object(worker, 'RUNS', self.root / '.runtime/codex-runs')
        self.runs_patch.start()
        self.current = {'head': 'test-head', 'fingerprint': 'test-fingerprint'}
        self.state_patch = patch.object(worker, 'source_state', return_value=self.current)
        self.state_patch.start()
        self.path = worker.prepare()
        worker.save(self.path / 'exit.json', {'run_id': self.path.name, 'exit_code': 0})
        (self.path / 'events.jsonl').write_text('{"type":"turn.completed"}\n')
        self.report = {'run_id': self.path.name, 'baseline_head': 'test-head',
                       'baseline_fingerprint': 'test-fingerprint', 'outcome': 'passed',
                       'checks': [], 'changed_files': [], 'blockers': [], 'next_actions': []}
        for name in worker.CHECKS:
            file = self.path / 'evidence' / (name + '.log')
            file.write_text('UNIT TEST FIXTURE ONLY\n')
            self.report['checks'].append({'id': name, 'status': 'passed', 'commands': ['fixture only'],
                'evidence_paths': [str(file.relative_to(self.root))], 'notes': 'Not actual Codex execution'})
        self.write_report()

    def tearDown(self):
        self.state_patch.stop()
        self.runs_patch.stop()
        self.root_patch.stop()
        self.temp.cleanup()

    def write_report(self):
        worker.save(self.path / 'report.json', self.report)

    def check(self):
        return worker.validate(self.path, self.current)

    def test_complete_receipt_requires_human_review(self):
        result = self.check()
        self.assertEqual(result['status'], 'ready_for_review')
        self.assertFalse(result['accepted'])
        self.assertTrue(result['review_required'])
        self.assertEqual(len(result['artifacts']), 6)

    def test_zero_exit_without_final_report_is_not_success(self):
        (self.path / 'report.json').unlink()
        self.assertEqual(self.check()['status'], 'invalid_report')

    def test_nonzero_process_exit_cannot_be_hidden_by_summary(self):
        worker.save(self.path / 'exit.json', {'run_id': self.path.name, 'exit_code': 1})
        self.assertEqual(self.check()['status'], 'invalid_report')

    def test_error_event_prevents_acceptance(self):
        (self.path / 'events.jsonl').write_text('{"type":"error"}\n{"type":"turn.completed"}\n')
        self.assertEqual(self.check()['status'], 'invalid_report')

    def test_stale_source_is_rejected(self):
        result = worker.validate(self.path, {'head': 'test-head', 'fingerprint': 'changed'})
        self.assertEqual(result['status'], 'invalid_report')

    def test_mixed_run_report_is_rejected(self):
        self.report['run_id'] = 'another-job'
        self.write_report()
        self.assertEqual(self.check()['status'], 'invalid_report')

    def test_missing_artifact_is_rejected(self):
        (self.path / 'evidence/typecheck.log').unlink()
        self.assertEqual(self.check()['status'], 'invalid_report')

    def test_cross_run_artifact_is_rejected(self):
        self.report['checks'][0]['evidence_paths'] = ['docs/evidence/week1/typecheck.log']
        self.write_report()
        self.assertEqual(self.check()['status'], 'invalid_report')

    def test_evidence_symlink_outside_run_is_rejected(self):
        outside = self.root / 'outside.log'
        outside.write_text('not evidence')
        file = self.path / 'evidence/typecheck.log'
        file.unlink()
        file.symlink_to(outside)
        self.assertEqual(self.check()['status'], 'invalid_report')

    def test_partial_check_cannot_claim_overall_passed(self):
        self.report['checks'][-1]['status'] = 'blocked'
        self.write_report()
        self.assertEqual(self.check()['status'], 'invalid_report')
        self.report['outcome'] = 'blocked'
        self.write_report()
        self.assertEqual(self.check()['status'], 'needs_attention')

    def test_all_checks_are_mandatory(self):
        self.report['checks'].pop()
        self.write_report()
        self.assertEqual(self.check()['status'], 'invalid_report')

    def test_run_paths_do_not_accept_arbitrary_files(self):
        with self.assertRaises(ValueError):
            worker.get_run('../../.data')

    def test_missing_codex_fails_closed_without_process(self):
        fresh = worker.prepare()
        with patch.object(worker.shutil, 'which', return_value=None), patch.object(worker.subprocess, 'Popen') as spawn:
            result = worker.run(fresh, 30)
        spawn.assert_not_called()
        self.assertEqual(result['code'], 'CODEX_NOT_ON_PATH')
        self.assertFalse(result['codex_started'])
        self.assertFalse(result['accepted'])


if __name__ == '__main__':
    unittest.main()
