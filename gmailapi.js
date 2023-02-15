const { Configuration, OpenAIApi } = require("openai");
const { google } = require("googleapis");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

//---------------------------------------create gmail API--------------------------------------//
const CLIENT_ID = process.env.CLIENT_ID;

const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const REDIRECT_URI = process.env.REDIRECT_URI;

// -----------------------------------create OAuth2 client-------------------------------------//
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

//--------------------------------- set the access token and refereshtoken----------------------//
oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN,
    accessToken: ACCESS_TOKEN,
});

//------------------------------------------- create Gmail API client--------------------------//
const gmail = google.gmail({
    version: "v1",
    auth: oauth2Client,
});

// ------------------------------------retrieve messages from Gmail--------------------------//
async function listmessages() {
    const res = await gmail.users.messages.list({
        auth: oauth2Client,
        userId: "me",
        maxResults: 1,
    });
    const messages = res.data.messages;

    if (messages) {
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            // console.log(message);
            const messageRes = await gmail.users.messages.get({
                auth: oauth2Client,
                userId: "me",
                id: message.id,
            });
            return messageRes;
            // console.log(messageRes);
            // console.log(`Message ID: ${message.id}`);
            // console.log(`Snippet: ${messageRes.data.snippet}`);
        }
    } else {
        // console.log("No messages found.");
        return "No messages found.";
    }
}

//--------------------- Classify the email content using the OpenAI API----------------------//
const configuration = new Configuration({
    apiKey: process.env.OPEN_AI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function classifyEmails(content) {
    const prompt = `Classify this \"${content}\" as a feature, bug, or lead`;
    const response = await openai.createCompletion({
        model: "text-davinci-002",
        prompt: prompt,
        max_tokens: 20,
        temperature: 0.5,
    });
    return response.data.choices[0].text;
}

async function main() {
    const messageres = await listmessages();
    const result = await classifyEmails(messageres.data.snippet);

    let data = [];
    let obj = {
        message: messageres.data.snippet,
        classification: result,
    };
    data.push(obj);
    fs.writeFile("./response.json", JSON.stringify(data), (err) => {
        if (err) {
            throw err;
        }
        console.log("file saved");
    });
    console.log(messageres.data.snippet, result);
}

main();
