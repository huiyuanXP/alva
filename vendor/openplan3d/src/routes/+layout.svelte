<script>
  import '../app.css';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { env } from '$env/dynamic/public';
  import { themePreference } from '$lib/stores/theme';
  import DeploymentNotice from '$lib/components/DeploymentNotice.svelte';
  // Self-hosted instances and browser tests can run without sending analytics.
  // Consultation fork: no analytics or remote Firebase initialization.
  let { children } = $props();
</script>

{@render children()}
<DeploymentNotice />
