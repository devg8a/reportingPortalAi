import { ApiClient, Board } from '@mondaydotcomorg/api';
import logger from "../../utils/logger";
import { formatClientsData } from "./monday-utils"

/**
 * node package: https://www.npmjs.com/package/@mondaydotcomorg/api
 * Documentation: https://developer.monday.com/api-reference/docs/api-sdk
 * column values: https://developer.monday.com/api-reference/docs/change-column-values
 */
export class MondayService {
    static createTask(boardId: any, groupName: any, task: any, sendDate: any, creativeDueDate: any, status: any, code: any): any {
        throw new Error('Method not implemented.');
    }
    private client: ApiClient;
    private activeClientListBoardId = process.env.ACTIVE_CLIENT_LIST_BOARD_ID;
    // private activeClientListSubitemId = "4918059778";
    constructor() {
        this.client = new ApiClient({ token: process.env.MONDAY_ACCESS_TOKEN });
    }

    async mondayApihealth() {
        try {
            const detail = await this.client.operations.getMeOp();
            return detail?.me;
        } catch (error) {
            return error;
        }
    }

    async mondayClientList() {
        try {
            const { boards } = await this.client.request<{ boards: [Board]; }>(
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
                                                        column {
                                                            title
                                                        }
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
        } catch (error) {
            logger.error(error);
        }
    }

    async updateMondayBoard() {
        try {
            /**Single column update**/
            const changeTextColumn = await this.client.operations.changeColumnValueOp({
                boardId: this.activeClientListBoardId,
                itemId: "11373721938",
                columnId: "date1__1",
                value: JSON.stringify({ date: "2025-01-17" }),
            });

            /**Multiple columns update**/
            // const changeTextColumn = await this.client.operations.changeMultipleColumnValuesOp({
            //     boardId  : this.activeClientListBoardId,
            //     itemId   : "11373723208",
            //     columnValues: JSON.stringify({
            //         date1__1: { date: "2026-02-25" },
            //         date__1: { date: "2026-02-26" }
            //     }),
            // });
            return changeTextColumn;
        } catch (error) {
            logger.info(error, "Monday client List: Update client issue: ");
            throw error;
        }
    }

    async getBoards(boardIds) {
        try {
            const query = `
                query ($boardIds: [ID!]) {
                boards(ids: $boardIds) {
                        name
                        groups{
                            id
                            title
                            items_page(limit: 50) {
                                items {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            `;

            const variables = {
                boardIds: boardIds
            };
            const response: any = await this.client.request(query, variables);
            console.log("response==>", response?.boards[0].groups);
            return response;
            // console.log("response==>", response?.boards[0].groups);
            // console.log("response==>", response?.boards[0].groups[0].items_page.items);
        }catch(error){
            logger.info(error, "Monday Fetch groups issue: ");
            throw error;
        }

    }


    async createGroup(boardId, groupName) {
        try{
            const query = `
                mutation ($boardId: ID!, $groupName: String!) {
                create_group (
                    board_id: $boardId
                    group_name: $groupName
                ) {
                    id
                    title
                }
                }
            `;
    
            const variables = {
                boardId: boardId,
                groupName: groupName
            };
            const response = await this.client.request(query, variables);
            return response;
        }catch(error){
            logger.info(error, "Monday create group issue: ");
            throw error;
        }
    }

    async createItem(boardId, groupId, task, columnValues) {
        try{
            const query = `
            mutation ($boardId: ID!, $groupId: String!, $task: String!, $columnValues: JSON!) {
                create_item(
                    board_id: $boardId
                    group_id: $groupId
                    item_name: $task
                    column_values: $columnValues
                ) {
                    id
                    name
                }
            }`;

            const variables = {
                boardId,
                groupId,
                task,
                columnValues
            };
            const response = await this.client.request(query, variables);
            console.log("Item Created:", response);
            return response;
        }catch(error){
            logger.info(error, "Monday create Item issue: ");
            throw error;
        }
    }


    async createTask(boardId, groupName, task, sendDate, creativeDueDate, status, code) {
        try{
            const boardsData: any = await this.getBoards([boardId]);
            const groups = boardsData?.boards[0]?.groups || [];

            let groupId;

            const matchedGroup = groups.find(g => g.title === groupName);

            if (matchedGroup) {
                groupId = matchedGroup.id;
            } else {
                const newGroup: any = await this.createGroup(boardId, groupName);
                groupId = newGroup?.create_group?.id;
            }

            const columnValues = JSON.stringify({
                timeline: { from: sendDate, to: sendDate },
                text1: creativeDueDate,
                status: { label: status },
                text: code
            });

            return await this.createItem(boardId, groupId, task, columnValues);
        }catch(error){
            logger.info(error, "Monday create Task issue: ");
            throw error;
        }
    }

}
