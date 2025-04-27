import { type FormTemplate, FormTemplateModel } from "./formTemplateModel";

export class FormTemplateRepository {
  async getAllTemplates(): Promise<FormTemplate[]> {
    return FormTemplateModel.find().select("-__v").lean();
  }

  async getTemplateById(templateId: string): Promise<FormTemplate | null> {
    return FormTemplateModel.findById(templateId).select("-__v").lean();
  }

  async createTemplate(templateData: FormTemplate): Promise<FormTemplate> {
    const formTemplate = new FormTemplateModel(templateData);
    return formTemplate.save();
  }

  async updateTemplate(templateId: string, templateData: Partial<FormTemplate>): Promise<FormTemplate | null> {
    return FormTemplateModel.findByIdAndUpdate(templateId, templateData, { new: true }).select("-__v").lean();
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    const result = await FormTemplateModel.findByIdAndDelete(templateId).lean();
    return !!result;
  }

  async createMockDataFormTemplate(): Promise<void> {
    try {
      await FormTemplateModel.deleteMany({});
      const result = await FormTemplateModel.insertMany(this.mockFormTemplateData);
      console.debug("Form template mock data created:", result);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // Mock data for formTemplate
  public mockFormTemplateData = [
    {
      _id: "67b4e612d0feb4ad99ae2e83",
      title: "EFAS Score",
      description: "A form to calculate EFAS score",
      markdownHeader: JSON.stringify(`
# EUROPEAN FOOT AND ANKLE SOCIETY - EFAS Score
## Einleitung
Auf der folgenden Seite finden Sie 6 Fragen zur Ihren Problemen am Fuß und/oder Sprunggelenk.

Bitte beantworten Sie alle Fragen so, dass Sie Ihre Situation ___innerhalb der letzten Woche___ am passendsten beschreiben. Jede Frage hat 5 Antwortmöglichkeiten, d.h. eine 5-Punkte-Skala mit einer Beschreibung der Antworten bzw. Endpunkte.

Falls eine Frage für Sie nicht zutrifft, kreuzen Sie bitte "n.z." an und beantworten die Frage nicht.

## Sportfragen
Im zweiten Teil des Fragenbogens geht es um Sport.

Bitte beantworten Sie diese Fragen nur wenn Sie regelmäßig Sport treiben.

Bei Fragen, die für Ihre sportliche Betätigung nicht zutreffen, kreuzen Sie bitte n.z. an und beantworten die Frage nicht.
`),
      markdownFooter: JSON.stringify(`
## Sie haben den EFAS Fragebogen ausgefüllt
## Vielen Dank für Ihre Teilnahme!`),
      formSchema: {
        type: "object",
        properties: {
          standardfragebogen: {
            type: "object",
            properties: {
              q1: {
                type: "number",
                xrenderinghint: "efasRating",
                title: "Haben Sie in Ruhe Schmerzen im Fuß / Sprunggelenk ?",
                description: "0 immer -> 4 nie",
                tickLabelLow: "immer",
                tickLabelHigh: "nie",
              },
              q2: {
                title: "Wie weit können Sie gehen bis Sie Schmerzen am Fuß / Sprunggelenk bekommen?",
                description: "0 Gehen unmöglich -> 4 Keine Einschränkungen",
                type: "number",
                xrenderinghint: "efasRating",
                tickLabelLow: "immer",
                tickLabelHigh: "nie",
              },
              q3: {
                title:
                  "Wie stark hat sich Ihr Gang (d.h. die Art wie Sie gehen) wegen Problemen am Fuß / Sprunggelenk verändert?",
                description: "0 Extreme Veränderung -> 4 Keine Veränderung",
                type: "number",
                xrenderinghint: "efasRating",
                tickLabelLow: "extreme Veränderung",
                tickLabelHigh: "keine Veränderung",
              },
              q4: {
                title: "Haben Sie Schwierigkeiten beim Gehen auf unebenem Untergrund?",
                description: "0 immer -> 4 nie",
                type: "number",
                xrenderinghint: "efasRating",
                tickLabelLow: "immer",
                tickLabelHigh: "nie",
              },
              q5: {
                title: "Haben Sie Schmerzen im Fuß / Sprunggelenk beim Gehen?",
                description: "0 immer -> 4 nie",
                type: "number",
                xrenderinghint: "efasRating",
                tickLabelLow: "immer",
                tickLabelHigh: "nie",
              },
              q6: {
                title: "Wie oft haben Sie Schmerzen im Fuß / Sprunggelenk während körperlicher Aktivität?",
                description: "0 immer -> 4 nie",
                type: "number",
                xrenderinghint: "efasRating",
                tickLabelLow: "immer",
                tickLabelHigh: "nie",
              },
            },
          },
          sportfragebogen: {
            type: "object",
            properties: {
              s1: {
                title: "Können Sie rennen/schnell laufen?",
                description: "0 unmöglich -> 4 Keine Einschränkungen",
                type: "number",
                xrenderinghint: "efasRating",
                tickLabelLow: "unmöglich",
                tickLabelHigh: "keine Einschränkungen",
              },
              s2: {
                title: "Können Sie joggen/langsam laufen?",
                description: "0 unmöglich -> 4 Keine Einschränkungen",
                type: "number",
                xrenderinghint: "efasRating",
                tickLabelLow: "unmöglich",
                tickLabelHigh: "keine Einschränkungen",
              },
              s3: {
                title: "Haben Sie Probleme bei der Landung nach einem Sprung?",
                description: "0 unmöglich -> 4 Keine Einschränkungen",
                type: "number",
                xrenderinghint: "efasRating",
                tickLabelLow: "unmöglich",
                tickLabelHigh: "keine Einschränkungen",
              },
              s4: {
                title: "Können Sie Ihren Sport mit Ihrer üblichen Technik ausüben?",
                description: "0 unmöglich -> 4 Keine Einschränkungen",
                type: "number",
                xrenderinghint: "efasRating",
                tickLabelLow: "unmöglich",
                tickLabelHigh: "keine Einschränkungen",
              },
            },
          },
        },
      },
      formSchemaUI: {
        type: "VerticalLayout",
        elements: [
          {
            type: "Group",
            label: "Standard Fragen",
            elements: [
              {
                type: "VerticalLayout",
                elements: [
                  {
                    type: "Control",
                    scope: "#/properties/standardfragebogen/properties/q1",
                    options: {
                      slider: true,
                    },
                  },

                  {
                    type: "Control",
                    scope: "#/properties/standardfragebogen/properties/q2",
                    options: { format: "inlineradio" },
                  },
                  {
                    type: "Control",
                    scope: "#/properties/standardfragebogen/properties/q3",
                    options: { format: "inlineradio" },
                  },
                  {
                    type: "Control",
                    scope: "#/properties/standardfragebogen/properties/q4",
                    options: { format: "inlineradio" },
                  },
                  {
                    type: "Control",
                    scope: "#/properties/standardfragebogen/properties/q5",
                    options: { format: "inlineradio" },
                  },
                  {
                    type: "Control",
                    scope: "#/properties/standardfragebogen/properties/q6",
                    options: { format: "inlineradio" },
                  },
                ],
              },
            ],
          },
          {
            type: "Group",
            label: "Sport Fragen",
            elements: [
              {
                type: "VerticalLayout",
                elements: [
                  {
                    type: "Control",
                    scope: "#/properties/sportfragebogen/properties/s1",
                    options: { format: "inlineradio" },
                  },
                  {
                    type: "Control",
                    scope: "#/properties/sportfragebogen/properties/s2",
                    options: { format: "inlineradio" },
                  },
                  {
                    type: "Control",
                    scope: "#/properties/sportfragebogen/properties/s3",
                    options: { format: "inlineradio" },
                  },
                  {
                    type: "Control",
                    scope: "#/properties/sportfragebogen/properties/s4",
                    options: { format: "inlineradio" },
                  },
                ],
              },
            ],
          },
        ],
      },
      formData: {
        standardfragebogen: { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0 },
        sportfragebogen: { s1: 0, s2: 0, s3: 0, s4: 0 },
      },
    },
    {
      _id: "67b4e612d0feb4ad99ae2e84",
      title: "AOFAS Vorfuß Score",
      description: "A form to calculate AOFAS score",
      markdownHeader: JSON.stringify(`
      # American Orthopaedic Foot and Ankle Society - AOFAS Score
      ## Einleitung
      Auf der folgenden Seite finden Sie 8 Fragen zur Ihren Problemen am Großzeh.
      `),
      markdownFooter: JSON.stringify(`
      ## Sie haben den AOFAS Fragebogen ausgefüllt
      ## Vielen Dank für Ihre Teilnahme!`),

      formSchema: {
        type: "object",
        properties: {
          vorfußfragebogen: {
            type: "object",
            properties: {
              q1: {
                title: "Wie oft haben Sie Schmerzen bzw. wie stark ist der Schmerz am Vorfuß?",
                description: "",
                type: "string",
                oneOf: [
                  {
                    const: "40",
                    title: "kein Schmerz",
                  },
                  {
                    const: "30",
                    title: "leicht, gelegentlich",
                  },
                  {
                    const: "20",
                    title: "mittelmäßig, täglich",
                  },
                  {
                    const: "10",
                    title: "heftig, fast immer",
                  },
                ],
              },
              q2: {
                title: "Funktion, Einschränkung der Aktivität",
                description: "",
                type: "string",
                oneOf: [
                  {
                    const: "10",
                    title: "keine Einschränkungen, keine Stütze/ Hilfe",
                  },
                  {
                    const: "7",
                    title:
                      "keine Einschränkung bei den tägl. Aktivitäten, Einschränkung bei Freizeitaktivitäten, keine Hilfen",
                  },
                  {
                    const: "4",
                    title: "Einschränkung bei den täglichen Aktivitäten/ Freizeitaktivitäten, Stock",
                  },
                  {
                    const: "0",
                    title:
                      "starke Einschr. bei den täglichen Aktivitäten, Freizeitaktivitäten, Gehstütze, Krücke, Rollstuhl",
                  },
                ],
              },
              q3: {
                title: "Schuhwerk",
                description: "",
                type: "string",
                oneOf: [
                  {
                    const: "10",
                    title: "modische Konfektionsschuhe ohne Einlagen",
                  },
                  {
                    const: "5",
                    title: "Konfektionsschuhe mit Einlagen",
                  },
                  {
                    const: "0",
                    title: "Orthopädische Schuhe",
                  },
                ],
              },
              q4: {
                title: "Beweglichkeit im Großzehengrundgelenk",
                description: "",
                type: "string",
                oneOf: [
                  {
                    const: "10",
                    title: "normal oder leichte Einschränkungen (>75% von Norm)",
                  },
                  {
                    const: "5",
                    title: "mäßige Einschränkungen (30%-74% von Norm)",
                  },
                  {
                    const: "0",
                    title: "massive Einschränkungen (<30% von Norm)",
                  },
                ],
              },
              q5: {
                title: "Beweglichkeit im Großzehengelenk",
                description: "",
                type: "string",
                oneOf: [
                  {
                    const: "5",
                    title: "Keine Einschränkung",
                  },
                  {
                    const: "0",
                    title: "Starke Einschränkung",
                  },
                ],
              },
              q6: {
                title: "Stabilität im Großzehengrundgelenk",
                description: "",
                type: "string",
                oneOf: [
                  {
                    const: "5",
                    title: "stabil",
                  },
                  {
                    const: "0",
                    title: "stark eingeschränkt",
                  },
                ],
              },
              q7: {
                title: "Schwiele am Hallux",
                description: "",
                type: "string",
                oneOf: [
                  {
                    const: "5",
                    title: "keine oder symptomlos",
                  },
                  {
                    const: "0",
                    title: "mit Symptomen",
                  },
                ],
              },
              q8: {
                title: "Achsenfehlstellung",
                description: "",
                type: "string",
                oneOf: [
                  {
                    const: "15",
                    title: "gut, Zehen acshengerecht",
                  },
                  {
                    const: "8",
                    title: "mittelmäßig, gewisse Achsenabweichungen",
                  },
                  {
                    const: "0",
                    title: "schlecht , starke Achsenabweichungen",
                  },
                ],
              },
            },
          },
        },
      },
      formSchemaUI: {
        type: "VerticalLayout",
        elements: [
          {
            type: "Control",
            scope: "#/properties/vorfußfragebogen/properties/q1",
            options: { format: "radio" },
          },
          {
            type: "Control",
            scope: "#/properties/vorfußfragebogen/properties/q2",
            options: { format: "radio" },
          },
          {
            type: "Control",
            scope: "#/properties/vorfußfragebogen/properties/q3",
            options: {
              format: "radio",
            },
          },
          {
            type: "Control",
            scope: "#/properties/vorfußfragebogen/properties/q4",
            options: { format: "radio" },
          },
          {
            type: "Control",
            scope: "#/properties/vorfußfragebogen/properties/q5",
            options: { format: "radio" },
          },
          {
            type: "Control",
            scope: "#/properties/vorfußfragebogen/properties/q6",
            options: { format: "radio" },
          },
          {
            type: "Control",
            scope: "#/properties/vorfußfragebogen/properties/q7",
            options: { format: "radio" },
          },
          {
            type: "Control",
            scope: "#/properties/vorfußfragebogen/properties/q8",
            options: { format: "radio" },
          },
        ],
      },
      formData: {
        vorfußfragebogen: { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0 },
      },
    },
  ];
}

export const formTemplateRepository = new FormTemplateRepository();
