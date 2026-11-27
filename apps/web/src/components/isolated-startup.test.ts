import {afterEach,expect,it,vi} from 'vitest';
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});
it('uses supported regular production output for the isolated review launcher',async()=>{
 vi.stubEnv('A6_ISOLATED_REVIEW','1');vi.resetModules();
 const {default:config}=await import('../../next.config');
 expect(config.output).toBeUndefined();
});
it('preserves standalone output and Next defaults outside isolated review',async()=>{
 vi.stubEnv('A6_ISOLATED_REVIEW','');vi.resetModules();
 const {default:config}=await import('../../next.config');
 expect(config.output).toBe('standalone');expect(config.experimental?.agentUpgrade).toBeUndefined();
});
