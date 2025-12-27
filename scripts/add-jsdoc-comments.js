const fs = require('fs');
const path = require('path');

// Controller files to process
const controllers = [
  'src/api/case/patientCaseController.ts',
  'src/api/clinicalStudy/clinicalStudyController.ts',
  'src/api/code/codeController.ts',
  'src/api/consultation/consultationController.ts',
  'src/api/form/formController.ts',
  'src/api/formtemplate/formTemplateController.ts',
  'src/api/kiosk/kioskController.ts',
  'src/api/patient/patientController.ts',
  'src/api/statistics/statisticsController.ts',
  'src/api/surgery/surgeryController.ts',
  'src/api/user/userController.ts',
  'src/api/userDepartment/userDepartmentController.ts',
];

function addClassJSDoc(content, className, description) {
  const classRegex = new RegExp(`(\\n)(class ${className}[^{]*{)`, 'm');
  if (content.match(classRegex) && !content.includes(`@class ${className}`)) {
    return content.replace(classRegex, `\n/**\n * ${description}\n * @class ${className}\n */\n$2`);
  }
  return content;
}

function addMethodJSDoc(content, methodName, jsdoc) {
  // Check if method already has JSDoc
  const hasJSDoc = new RegExp(`/\\*\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/\\s*public ${methodName}:`, 's').test(content);
  if (hasJSDoc) {
    console.log(`  Skipping ${methodName} - already has JSDoc`);
    return content;
  }

  const methodRegex = new RegExp(`(\\n)(  public ${methodName}:)`, 'm');
  if (content.match(methodRegex)) {
    return content.replace(methodRegex, `\n${jsdoc}\n$2`);
  }
  return content;
}

console.log('Adding JSDoc comments to controller files...\n');

controllers.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    console.log(`Processing: ${filePath}`);
    
    // Add class-level JSDoc if not already present
    const fileName = path.basename(filePath, '.ts');
    
    // Add method JSDoc for common patterns
    const publicMethods = content.match(/public \w+:\s*RequestHandler/g);
    if (publicMethods) {
      console.log(`  Found ${publicMethods.length} public methods`);
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`  ✓ Updated`);
    } else {
      console.log(`  - No changes needed`);
    }
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('\nDone!');
