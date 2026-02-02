import dayjs from "dayjs";

async function groupDayWiseTransactionData(transactionData){
	const result = transactionData.reduce((acc, item) => {
					const date = dayjs(item?.transactionDate).format('YYYY-MM-DD');
					if (!acc[date]) {
					   acc[date] = [];
					}

					acc[date].push(item);

					return acc;
					}, {});
	return result;
}

export default groupDayWiseTransactionData;