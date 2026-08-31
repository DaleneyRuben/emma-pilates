import { Controller, Delete, Get, Inject, Post } from '@nestjs/common';

export const mobileLogin = Symbol('mobileLogin');
export const authenticatedPrincipalResolver = Symbol(
  'authenticatedPrincipalResolver',
);
export const currentSessionLogout = Symbol('currentSessionLogout');

@Controller({ path: 'authentication-sessions', version: '1' })
export class AuthenticationController {
  constructor(
    @Inject(mobileLogin) private readonly loginHandler: unknown,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: unknown,
    @Inject(currentSessionLogout) private readonly logoutHandler: unknown,
  ) {}

  @Post()
  login(): never {
    throw new Error('Not implemented');
  }

  @Get('current')
  current(): never {
    throw new Error('Not implemented');
  }

  @Delete('current')
  logout(): never {
    throw new Error('Not implemented');
  }
}
