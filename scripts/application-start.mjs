// Deployment-only standalone entry. The existing isolated manual launcher is separate.
import {deploymentEnvironment} from './deployment-environment.mjs';
if(process.env.NODE_ENV!=='production')throw Error('application_production_mode_required');
deploymentEnvironment(process.env);
await import('../apps/web/server.js');
