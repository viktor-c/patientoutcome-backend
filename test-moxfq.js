const { formTemplateRepository } = require("./dist/api/formtemplate/formTemplateRepository.js");

// Set NODE_ENV to test to allow mock data access
process.env.NODE_ENV = "test";

console.log("\n🔍 Testing MOXFQ Template Integration...\n");

try {
  const templates = formTemplateRepository.mockFormTemplateData;
  const moxfqTemplate = templates.find((t) => t.title === "Manchester-Oxford Foot Questionnaire");

  if (moxfqTemplate) {
    console.log("✅ MOXFQ template found!");
    console.log("📋 Template ID:", moxfqTemplate._id);
    console.log("📝 Title:", moxfqTemplate.title);
    console.log("📄 Description:", `${moxfqTemplate.description.substring(0, 80)}...`);
    console.log("🌐 Has translations:", !!moxfqTemplate.translations);
    console.log(
      "🗣️  Available languages:",
      moxfqTemplate.translations ? Object.keys(moxfqTemplate.translations) : "None",
    );
    console.log("❓ Number of questions:", Object.keys(moxfqTemplate.formSchema.properties.moxfq.properties).length);

    // Test sample questions
    const q1 = moxfqTemplate.formSchema.properties.moxfq.properties.q1;
    const q15 = moxfqTemplate.formSchema.properties.moxfq.properties.q15;
    const q16 = moxfqTemplate.formSchema.properties.moxfq.properties.q16;

    console.log("\n📊 Sample Questions:");
    console.log("Q1 title:", q1.title || "Not set");
    console.log("Q1 enumNames:", q1.enumNames || "Not set");

    console.log("Q15 title:", q15.title || "Not set");
    console.log("Q15 enumNames:", q15.enumNames || "Not set");

    console.log("Q16 title:", q16.title || "Not set");
    console.log("Q16 enumNames:", q16.enumNames || "Not set");

    // Test that all questions have German titles
    const questions = moxfqTemplate.formSchema.properties.moxfq.properties;
    const questionsWithTitles = Object.keys(questions).filter((key) => questions[key].title);
    const questionsWithEnumNames = Object.keys(questions).filter((key) => questions[key].enumNames);

    console.log("\n📈 Complete Integration Status:");
    console.log("Questions with German titles:", `${questionsWithTitles.length}/16`);
    console.log("Questions with enumNames:", `${questionsWithEnumNames.length}/16`);

    // Test direct translations
    if (moxfqTemplate.translations) {
      console.log("\n🔤 Translation Samples:");
      console.log("German q1.label:", moxfqTemplate.translations.de["moxfq.q1.label"]);
      console.log("German q1.0:", moxfqTemplate.translations.de["moxfq.q1.0"]);
      console.log("English q1.label:", moxfqTemplate.translations.en["moxfq.q1.label"]);
      console.log("English q1.0:", moxfqTemplate.translations.en["moxfq.q1.0"]);
    }

    // Test schema and UI schema are present
    console.log("\n🏗️  Structure Check:");
    console.log("Has formSchema:", !!moxfqTemplate.formSchema);
    console.log("Has formSchemaUI:", !!moxfqTemplate.formSchemaUI);
    console.log("Has formData:", !!moxfqTemplate.formData);
    console.log("Has translations:", !!moxfqTemplate.translations);

    console.log("\n✅ MOXFQ template successfully loaded from JSON file!");
  } else {
    console.log("❌ MOXFQ template not found");
    console.log(
      "Available templates:",
      templates.map((t) => t.title),
    );
  }
} catch (error) {
  console.error("❌ Error:", error.message);
  console.error(error.stack);
}
