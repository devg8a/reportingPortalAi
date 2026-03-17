export function formatClientsData(boards){
    const groupsList = boards?.[0]?.groups?.[0]?.items_page?.items?.map(item => ({
                        id         : item?.id,
                        clientName : item?.name,
                        columns    : item?.column_values,
                        subitems   : item?.subitems
                        // columns    : item?.column_values?.reduce((acc, col) => {
                        //                 acc[col.id] = col.text ?? null;
                        //                 return acc;
                        //             }, {})
                    })) || [];
    return groupsList;
}