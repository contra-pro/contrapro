export function deploymentEnvironment(env){
 const stage=env.CONTRATPRO_DEPLOYMENT_STAGE??(env.NODE_ENV==='production'?'':'development');
 if(!['development','isolated-acceptance','staging','production'].includes(stage))throw Error('deployment_environment_invalid');
 if(env.NODE_ENV==='production'&&(!['staging','production'].includes(stage)||env.VITEST||env.A6_ISOLATED_REVIEW==='1'||env.A6_AUTH_POLISH_VERIFY==='1'))throw Error('deployment_environment_invalid');
 if(['staging','production'].includes(stage)&&env.NODE_ENV!=='production')throw Error('deployment_environment_invalid');
 if(stage==='isolated-acceptance'&&(env.NODE_ENV!=='test'||globalThis[Symbol.for('contratpro.isolated-verification')]!==true))throw Error('deployment_environment_invalid');
 return stage;
}
