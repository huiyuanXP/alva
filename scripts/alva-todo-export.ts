import {boardPayload} from '../api/todo/board.js';
process.stdout.write(JSON.stringify(boardPayload(), null, 2) + '\n');
