// SPDX-License-Identifier: Apache-2.0
import { execSync } from 'node:child_process';
import { loggerService } from '..';

export const installTransportPlugin = (pluginName: string): void => {
  try {
    loggerService.log(`Installing plugin ${pluginName}`);
    
    // Configure npm for GitHub packages if GH_TOKEN is available
    const ghToken = process.env.GH_TOKEN;
    if (ghToken && pluginName.startsWith('@tazama-lf/')) {
      loggerService.log('Configuring npm for GitHub packages');
      execSync('npm config set @tazama-lf:registry https://npm.pkg.github.com', { stdio: 'inherit' });
      execSync(`npm config set //npm.pkg.github.com/:_authToken ${ghToken}`, { stdio: 'inherit' });
    }
    
    execSync(`npm install ${pluginName}`, { stdio: 'inherit' });
  } catch (error) {
    loggerService.error(`Failed to install plugin ${pluginName}:`, error, 'installTransportPlugin');
  }
};
