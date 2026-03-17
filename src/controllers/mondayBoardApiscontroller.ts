import { MondayService } from "../liberaries/Monday/mondayLib";
import logger from "../utils/logger";



export const syncMondayGroup = async (req, res) => {
    try {
        const monday = new MondayService();
        const boardId = 4148302055;

        const {
            task,
            sendDate,
            creativeDueDate,
            status,
            code
        } = req.body;

        const groupName =
            req.body.groupName ||
            new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

        /** 1️⃣ Fetch groups */
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
                                column_values {
                                    id
                                    text
                                    value
                                }
                            }
                        }
                    }
                }
            }
        `;

        const response: any = await (monday as any).client.request(query, {
            boardIds: [boardId],
        });

        console.log(response, "response")

        const groups = response?.boards?.[0]?.groups || [];

        /** 2️⃣ Check group exists */
        let groupId;

        const existingGroup = groups.find(
            (g: any) => g.title.toLowerCase() === groupName.toLowerCase()
        );

        if (existingGroup) {
            groupId = existingGroup.id;
        } else {
            /** 3️⃣ Create group */
            const createMutation = `
                mutation ($boardId: ID!, $groupName: String!) {
                    create_group(
                        board_id: $boardId,
                        group_name: $groupName,
                        position: "TOP"
                    ) {
                        id
                    }
                }
            `;

            const createResponse: any = await (monday as any).client.request(
                createMutation,
                { boardId, groupName }
            );

            groupId = createResponse?.create_group?.id;
        }

        /** 4️⃣ Correct Column Values */
        const columnValues = JSON.stringify({
            timeline: { from: sendDate, to: sendDate },
            text1: creativeDueDate,
            status: { label: status },
            text: code
        });

        console.log("columnValues:", columnValues);

        /** 5️⃣ Create Item */
        const createItemMutation = `
            mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
                create_item(
                    board_id: $boardId
                    group_id: $groupId
                    item_name: $itemName
                    column_values: $columnValues
                ) {
                    id
                }
            }
        `;

        const itemResponse = await (monday as any).client.request(
            createItemMutation,
            {
                boardId,
                groupId,
                itemName: task,
                columnValues
            }
        );

        return res.status(200).json({
            success: true,
            message: "Task synced to Monday successfully.",
            data: itemResponse
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error syncing Monday board.",
            error: error?.message
        });
    }
};


export const updateMondayItem = async (req, res) => {
    try {
        const monday = new MondayService();
        const boardId = 4148302055;

        const {
            itemId,
            task,            // Item name update karna ho to
            sendDate,
            creativeDueDate,
            status,
            code
        } = req.body;

        // Validation
        if (!itemId) {
            return res.status(400).json({
                success: false,
                message: "itemId is required to update item"
            });
        }

        /** 1️⃣ Agar item name update karna hai (optional) */
        if (task) {
            const updateNameMutation = `
                mutation ($boardId: ID!, $itemId: ID!, $itemName: String!) {
                    change_simple_column_value(
                        board_id: $boardId
                        item_id: $itemId
                        column_id: "name"
                        value: $itemName
                    ) {
                        id
                    }
                }
            `;

            await (monday as any).client.request(updateNameMutation, {
                boardId,
                itemId,
                itemName: task
            });
        }

        /** 2️⃣ Build column values (only fields to update) */
        const columnValues: any = {};

        if (sendDate) {
            columnValues.timeline = { from: sendDate, to: sendDate };
        }
        if (creativeDueDate) {
            columnValues.text1 = creativeDueDate;
        }
        if (status) {
            columnValues.status = { label: status };
        }
        if (code) {
            columnValues.text = code;
        }

        /** 3️⃣ Update columns */
        const updateMutation = `
            mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
                change_multiple_column_values(
                    board_id: $boardId
                    item_id: $itemId
                    column_values: $columnValues
                ) {
                    id
                    name
                }
            }
        `;

        const response = await (monday as any).client.request(updateMutation, {
            boardId,
            itemId,
            columnValues: JSON.stringify(columnValues)
        });

        return res.status(200).json({
            success: true,
            message: "Item updated successfully on Monday.",
            data: response.change_multiple_column_values
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error updating Monday item.",
            error: error?.message
        });
    }
};