import dayjs from "dayjs";

async function groupDayWiseTransactionData(transactionData){
    const result = transactionData.reduce((acc, item) => {
                        const transactionDate = dayjs(item.date).format('YYYY-MM-DD');
                        if (!acc[transactionDate]) {
                            acc[transactionDate] = [];
                        }
                            acc[transactionDate].push(item);
                        return acc;
                    }, {});
    return result;
}

export default groupDayWiseTransactionData;