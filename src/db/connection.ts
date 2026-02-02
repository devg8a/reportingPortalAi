import mongoose from "mongoose";
import logger from '../utils/logger';

const connectDB = async () => {
	try{
		const dbConnectionString = process.env.DB_URL;
		await mongoose.connect(dbConnectionString);
		logger.info("Database connected successfully!");
	}
	catch(error){
		logger.error(error,"Database connection failed: ");
		process.exit(1);
	}
}
export default connectDB;