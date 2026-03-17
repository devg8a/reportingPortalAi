import { Client } from "@hubspot/api-client";
import {triggerApi} from "./hubspot-client";

/**
 * Node package: https://www.npmjs.com/package/@hubspot/api-client
 */
export class HubspotService {
    private hubspotClient : Client;
    constructor() {
        this.hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });
    }

    async getAllContacts() {
        try{
            let after = undefined;
            const allContacts = [];
            const res = await this.hubspotClient.crm.contacts.basicApi.getPage(
                100,        // limit (max 100)
                after,
                // ["email", "firstname", "lastname"]
            );
            allContacts.push(...res.results);
            return res;
        }catch(error){
            console.log("error==>",error);
        }

    }

    async fetchAllContactLists() {
    try {
        // const res = await triggerApi("https://api.hubapi.com/contacts/v1/lists")
        const res = await this.hubspotClient.crm.objects;
        console.log("res==>",res);
    } catch (e) {
        console.error(e);
    }
    }
}