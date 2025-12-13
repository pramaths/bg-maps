import {
  OpenAIStream,
  StreamingTextResponse,
  // experimental_StreamData,
} from "ai";
import OpenAI from "openai";

export const runtime = "edge";

const functions: OpenAI.Chat.ChatCompletionCreateParams.Function[] = [
  {
    name: "create_simple_form",
    description:
      "Use this function to convert user-provided information into a structured form, based on the provided information always generate the form related to the information. It dynamically generates a form based on the provided JSON schema, tailored to capture specific details as requested by the user. The function ensures that the form is interactive and user-friendly, making it ideal for collecting and organizing user inputs efficiently and shoudld only valid data. In this Never a normal text always produce a form whatever user convert that into form",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description:
            "Unique identifier for the form. Use a new ID for a new form or an existing ID to edit an existing form.",
        },
        jsonSchema: {
          // type: 'string',
          // description: 'Stringified object of JSON schema defining the structure of the form. It should include field types, titles, and descriptions. Define the data types, required fields, and overall structure of your form here. The schema dictates how user inputs are structured and validated. Do not use array types.'
          type: "object",
          description: `Object of JSON schema defining the structure of the form. It should include field types, titles, and descriptions. Define the data types, required fields, and overall structure of your form here. The schema dictates how user inputs are structured and validated.
- Must always include clear & concise 'title' property for each field in JSON Schema.
- Must always include informative & detailed 'description' property for each field in JSON Schema.
- Use UI Schema 'ui:placeholder' property to provide examples.
- Valid types: string, number, integer, object. Avoid: Do not use array and boolean types.
- Valid formats (optional): date, date-time.
- Must always use the most appropriate and specific type and format available .
- Range inputs must be split into multiple fields (e.g. start-stop, min-max, etc are 2 fields/questions).
-Always ask house value and content value in all the forms if the prompt is about incurance.
- Can include any additional JSON Schema properties for each field to customize the form's presentation.
- To aid in fast user input when there are finite choices use the enum property to provide a list of options for each field, or if the answer can be parsed as a number then use number type.
  For example, instead of room size being one string input, it can be split into three number inputs: length and width and height. Here considering this always provide form never give simple text`,
          // Prefer to ask structured questions with multiple choice answers rather than open-ended questions unless necessary. This will enable using the selected values or numbers as inputs for programs which cannot interpret text.`,
          properties: {
            type: {
              type: "string",
              description: 'Value must be "object"',
            },
          },
        },
        uiSchema: {
          // type: 'string',
          // description: 'Stringified object of UI schema for customizing the form\'s presentation. Customize the layout and presentation of your form fields here, including widget types and help texts. This schema controls the visual aspects of the form, enhancing user interaction and experience.'
          type: "object",
          description: `Object of UI schema for customizing the form\'s presentation. Customize the layout and presentation of your form fields here, including widget types and help texts. This schema controls the visual aspects of the form, enhancing user interaction and experience.
                    Must include thoughtful and helpful and nonredundant 'ui:placeholder' and 'ui:help' for each field.
                    Include any additional properties for each field to customize the form's presentation. Only ask valid Data`,
          properties: {},
        },
      },
      required: ["id", "jsonSchema", "uiSchema"],
    },
  },

  // Enhanced Map Component
  {
    name: "create_dynamic_map",
    description:
      "This function dynamically generates an interactive map based on user inputs. It is designed to visually represent geographic data or locations as specified by the user. The map can be customized with various markers, zoom levels, and center points, making it ideal for applications in travel planning, event location scouting, or geographical data visualization mainly focused for searching the home, bungalows.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description:
            "Unique identifier for the map. Use a new ID for a new map or an existing ID to edit an existing map. This ensures each map instance is uniquely referenced and managed.",
        },
        center: {
          type: "object",
          properties: {
            area: {
              type: "string",
              description:
                "A short textual description for central focus, such as a place name or description.",
            },
            lon: {
              type: "number",
              description:
                "Longitude of the map’s center point. Determines the horizontal focal point of the map.",
            },
            lat: {
              type: "number",
              description:
                "Latitude of the map’s center point. Determines the vertical focal point of the map.",
            },
          },
          required: ["lon", "lat"],
          description:
            "Coordinates for the central focus of the map. This setting controls which geographical area the map initially displays.",
        },
        zoomLevel: {
          type: "number",
          description:
            "Defines the initial zoom level of the map. A higher value indicates a closer view, and a lower value provides a broader view. Adjust this to control how much of the area around the center point is visible upon loading.",
        },
        markers: {
          type: "array",
          description:
            "A collection of markers to be placed on the map. Each marker represents a specific location or point of interest.",
          items: {
            type: "object",
            properties: {
              label: {
                type: "string",
                description:
                  "A textual label for the marker, such as a place name or description.",
              },
              lon: {
                type: "number",
                description: "Longitude of the marker position.",
              },
              lat: {
                type: "number",
                description: "Latitude of the marker position.",
              },
              color: {
                type: "string",
                description:
                  "Color of the marker. This can be used to categorize or differentiate markers.",
              },
            },
            required: ["label", "lon", "lat"],
          },
        },
      },
      required: ["id", "center", "zoomLevel", "markers"],
    },
  },
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      stream: true,
      messages: [
        {
          // id: nanoid(),
          role: "system",
          content: `
You are an intelligent assistant specializing in understanding user needs and intentions for the purpose of dynamically constructing a context-dependent UI using available components.

When you receive a user's input, your first task is to decipher the user's intention. Consider the context, the specifics of the request, and any underlying needs or goals. If the request is ambiguous or lacks detail, ask targeted follow-up questions to gather the necessary information. Your aim is to develop a clear and comprehensive understanding of what the user wants to achieve, such that you can invoke the following tools to display to the user:
Available tools:
- Interactive Map: Essential for travel planning, event locations,buying home, bungalows  and potentially home automation control.
- Customizable Forms/Input Components: To present to a user to ask them follow up questions that clarify their intent.

Instructions: 
- If you need further context from the user to understand their intention sufficient enough to generate a good UI, respond with 3-5 follow-up questions or statements to clarify the user's intention. Focus on understanding the specific requirements, preferences, or constraints related to their request.
- If you have only 1 quick follow-up question then use chat, otherwise must always use the 'create_simple_form' function but most of them time even its is just 1 quick follow-up question use the create_simple_form.
`,
        },
        // {
        //     id: nanoid(),
        //     role: 'assistant',
        //     function_call: `{"function_call": {"name": "create_simple_form", "arguments": "{\n  \"id\": \"trip_planning_form\",\n  \"jsonSchema\": \"{\\\"title\\\":\\\"Lake Tahoe Trip Planning\\\",\\\"type\\\":\\\"object\\\",\\\"properties\\\":{\\\"dates\\\":{\\\"type\\\":\\\"string\\\",\\\"title\\\":\\\"What are the intended dates for your trip?\\\",\\\"format\\\":\\\"date\\\"},\\\"transportation\\\":{\\\"type\\\":\\\"string\\\",\\\"title\\\":\\\"How do you plan to get to Lake Tahoe?\\\",\\\"enum\\\":[\\\"Car\\\",\\\"Bus\\\",\\\"Train\\\",\\\"Plane\\\",\\\"Other\\\"]},\\\"accommodation\\\":{\\\"type\\\":\\\"string\\\",\\\"title\\\":\\\"What type of accommodation are you looking for?\\\",\\\"enum\\\":[\\\"Hotel\\\",\\\"Motel\\\",\\\"Cabin\\\",\\\"Resort\\\",\\\"Airbnb\\\"]},\\\"activities\\\":{\\\"type\\\":\\\"string\\\",\\\"title\\\":\\\"What activities are you interested in at Lake Tahoe?\\\",\\\"description\\\":\\\"e.g., skiing, hiking, boating\\\"},\\\"budget\\\":{\\\"type\\\":\\\"string\\\",\\\"title\\\":\\\"What is your budget for the trip per person?\\\"},\\\"preferences\\\":{\\\"type\\\":\\\"string\\\",\\\"title\\\":\\\"Do you have any specific preferences or needs for this trip`,
        // }
        ...messages,
      ],
      functions,
    });

    const stream = OpenAIStream(response, {
      onCompletion(completion) {
        console.log("completionnnnnß", completion);
      },
    });
    return new StreamingTextResponse(stream);
  } catch (error: any) {
    console.error(error);
    // return new Response('Internal server error', { status: 500 });
    return new Response(error.message, { status: 500 });
  }
}
