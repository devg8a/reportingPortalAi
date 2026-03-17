import dayjs from "dayjs";

async function groupDayWiseTransactionData(transactionData){
	const result = transactionData.reduce((acc, item) => {
						const eventDate = dayjs(item.eventDate).format('YYYY-MM-DD');
						if (!acc[eventDate]) {
							acc[eventDate] = [];
						}
							acc[eventDate].push(item);
						return acc;
					}, {});
	return result;
}

export default groupDayWiseTransactionData;