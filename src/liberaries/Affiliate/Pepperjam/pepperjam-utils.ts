async function groupDayWiseTransactionData(transactionData){
	const result = transactionData.reduce((acc, item) => {
					const { date } = item;

					if (!acc[date]) {
					   acc[date] = [];
					}

					acc[date].push(item);

					return acc;
					}, {});
	return result;
}

export default groupDayWiseTransactionData;