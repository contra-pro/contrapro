import 'server-only';import {cookies} from 'next/headers';import {connection} from 'next/server';import {pendingInvitationCookie,readInvitation} from './invitation';
export async function getPendingInvitation(){await connection();return readInvitation((await cookies()).get(pendingInvitationCookie)?.value,process.env.CONTRATPRO_AUTH_FLOW_SECRET??'',Date.now());}
