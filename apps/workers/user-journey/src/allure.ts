import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execAsync = promisify(exec)

export async function generateAllureReport(workDir: string): Promise<string> {
  const allureResultsDir = path.join(workDir, 'allure-results')
  const allureReportDir = path.join(workDir, 'allure-report')

  try {
    // Generate Allure HTML report from results
    console.log('Generating Allure report...')
    const { stdout, stderr } = await execAsync(
      `npx allure generate ${allureResultsDir} -o ${allureReportDir} --clean`,
      { 
        timeout: 60000,
        env: { ...process.env, JAVA_HOME: '/usr/lib/jvm/java-17-openjdk-amd64' }
      }
    )
    
    console.log('Allure generate output:', stdout)
    if (stderr) console.error('Allure stderr:', stderr)

    // Return the path to index.html
    return `/reports/${path.basename(workDir)}/allure-report/index.html`
  } catch (error) {
    console.error('Error generating Allure report:', error)
    
    // Fallback: create simple HTML if Allure fails
    await fs.mkdir(allureReportDir, { recursive: true })
    const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Report - ${path.basename(workDir)}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    h1 { color: #f59e0b; }
  </style>
</head>
<body>
  <h1>⚠ Report Generation Failed</h1>
  <p>Job ID: ${path.basename(workDir)}</p>
  <p>Test execution completed but Allure report generation failed.</p>
  <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
  <p><small>Generated at: ${new Date().toISOString()}</small></p>
</body>
</html>
    `
    await fs.writeFile(path.join(allureReportDir, 'index.html'), reportHtml)
    return `/reports/${path.basename(workDir)}/allure-report/index.html`
  }
}
