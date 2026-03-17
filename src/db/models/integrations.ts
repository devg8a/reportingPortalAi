// import mongoose from 'mongoose';

// const integrationSchema = new mongoose.Schema({
// 	client_id    : { type: mongoose.Schema.Types.ObjectId, ref:'ClientDetails', required: [true, "Client ID is required."], index:true },
// 	is_primary    : { type: Boolean, default: false },
// 	network      : { type: String},
// 	value 		 : { type: String},  //META accountId, GA accountId, ADWORD accountId, BING accountId, CRITEO accountId,SHOPIFY store_url, LEVANTA,IMPACT , AWIN, CJ,AVANTLINK authkey, PEPPERJAM authkey
// 	token   	 : { type: String }, //SHOPIFY accessToken, IMPACT authToken, AWIN authToken, RAKUTEN authToken, AVANTLINK authkey
// 	version      : { type: String }, //PEPPERJAM version
// 	account_name : { type: String }, //IMPACT AccountName, AWIN AccountName
// 	program_id   : { type: String }, //IMPACT programId
// 	timezone     : { type: String }, //AWIN
// 	is_backed_data_synced: { type: Boolean, default:false },
// },
// { 
// 	timestamps: true,
// 	versionKey: false,
// 	collection: 'integrations',
// },
// );

// integrationSchema.index({ client_id: 1, network: 1, value: 1 }, { unique: true });
// const Integrations = mongoose.model("Integrations",integrationSchema); 

// export default Integrations;