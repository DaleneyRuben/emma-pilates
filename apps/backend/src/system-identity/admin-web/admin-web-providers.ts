import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment';
import { completePasswordRecovery } from '../account-security/password-recovery';
import { passwordRecoveryDependencies } from '../account-security/password-recovery-dependencies';
import type { PrismaAccountSecurityGateway } from '../account-security/prisma-account-security-gateway';
import { login, type LoginCommand } from '../authentication/login';
import { loginDependencies } from '../authentication/login-dependencies';
import type { PrismaAuthenticationGateway } from '../authentication/prisma-authentication-gateway';
import { AuthenticationLinkCipher } from '../security/authentication-link-cipher';
import {
  adminWebLogin,
  adminWebPasswordRecoveryCompletion,
} from './admin-web-session.controller';

export const adminWebProviders = (gateways: {
  authentication: symbol;
  accountSecurity: symbol;
}): Provider[] => [
  {
    provide: adminWebLogin,
    inject: [gateways.authentication, ConfigService],
    useFactory:
      (
        gateway: PrismaAuthenticationGateway,
        config: ConfigService<Environment, true>,
      ) =>
      (command: LoginCommand) =>
        login(
          { ...command, surface: 'admin_web' },
          loginDependencies(gateway, config),
        ),
  },
  {
    provide: adminWebPasswordRecoveryCompletion,
    inject: [gateways.accountSecurity, AuthenticationLinkCipher],
    useFactory:
      (
        gateway: PrismaAccountSecurityGateway,
        linkCipher: AuthenticationLinkCipher,
      ) =>
      (command: { token: string; password: string }) =>
        completePasswordRecovery(
          command,
          passwordRecoveryDependencies(gateway, linkCipher),
          'admin_web',
        ),
  },
];
