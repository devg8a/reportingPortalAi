import { ApiClient,Board } from '@mondaydotcomorg/api';
import logger from "../../utils/logger";
import { formatClientsData } from "./monday-utils"

/**
 * node package: https://www.npmjs.com/package/@mondaydotcomorg/api
 * Documentation: https://developer.monday.com/api-reference/docs/api-sdk
 */
export class MondayService{
    private client : ApiClient;
    constructor(){
        this.client = new ApiClient({token: process.env.MONDAY_ACCESS_TOKEN});
    }

    async mondayApihealth(){
        try{
            const detail = await this.client.operations.getMeOp();
            return detail?.me;
        }catch(error){
            return error;
        }
    }

    async mondayClientList(){
        try{
            const { boards } = await this.client.request<{boards: [Board];}>(
                            `query { 
                                boards(ids: ${process.env.ACTIVE_CLIENT_LIST_BOARD_ID})
                                {   id 
                                    name
                                    groups(ids: ["topics"]) {
                                        id
							            title
                                        items_page(limit: 500) {
                                            items {
                                                id
                                                name
                                                column_values {
                                                    id
                                                    text
                                                    column {
                                                        title
                                                    }
                                                }
                                                subitems {
                                                    id
                                                    name
                                                    column_values {
                                                        id
											            text
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }`
                        );
            const activeClientList = formatClientsData(boards);
            return activeClientList;
        }catch(error){
            logger.error(error);
        }
    }
}
