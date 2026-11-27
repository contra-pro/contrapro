import {NextRequest} from 'next/server';import {handleRegistration} from '../../../../registration/handler';
export async function POST(request:NextRequest,{params}:{params:Promise<{locale:string}>}){return handleRegistration(request,(await params).locale);}
