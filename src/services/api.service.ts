import schedularLogs from "../db/models/schedularLogs";
import { NETWORK_REGISTRY } from "../config/networkRegistry";
import {formattedDate} from "../helper/helper";

export const callNetworkAPI = async (
  network: string,
  log: any
): Promise<void> => {
    try {
        const networkConfig = NETWORK_REGISTRY[network];
        if (!networkConfig) {
            throw new Error(`Unsupported network: ${network}`);
        }
        // console.log("log AT API==>",log)
        const reqParams = networkConfig.buildParams(log?.connection_id);
        const baseReqData = {
            startDate     : formattedDate(log.start_date),
            endDate       : formattedDate(log.end_date),
            ...reqParams
        }
        // console.log("baseReqData==>",baseReqData);
        let service = networkConfig.service;
        console.log(`Calling ${network} API for schedularLog ID: ${log._id}`);
        await service[networkConfig.method](baseReqData);
        await schedularLogs.findByIdAndUpdate(log._id, {
            status: "completed"
        });
    }catch(error){
        throw error;
    }
};