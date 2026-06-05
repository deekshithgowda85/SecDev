export interface RepoMeta {
  framework: string;
  hasNextJs: boolean;
  totalDependencies: number;
}

/**
 * Parses a repository's package.json content to detect the framework
 * and size metrics for intelligent resource allocation.
 */
export function analyzePackageJson(packageJsonContent: string): RepoMeta {
  try {
    const pkg = JSON.parse(packageJsonContent);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    const totalDependencies = Object.keys(deps).length;
    let framework = 'static';
    let hasNextJs = false;

    if (deps['next']) {
      framework = 'nextjs';
      hasNextJs = true;
    } else if (deps['@nestjs/core']) {
      framework = 'nest';
    } else if (deps['express']) {
      framework = 'express';
    } else if (deps['nuxt']) {
      framework = 'nuxt';
    } else if (deps['react'] && !deps['next']) {
      framework = 'react-spa';
    }

    return {
      framework,
      hasNextJs,
      totalDependencies
    };
  } catch (_error) {
    // Fallback if package.json is missing or malformed
    return {
      framework: 'static',
      hasNextJs: false,
      totalDependencies: 0
    };
  }
}
