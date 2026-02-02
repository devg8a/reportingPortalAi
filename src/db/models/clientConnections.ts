import mongoose from 'mongoose';

const clientConnectionsSchema = new mongoose.Schema({
  client_id    : { type: mongoose.Schema.Types.ObjectId, ref: 'client_details', required: [true, "Client ID is required."]},
  ordering     : { type: Number},
  is_primary   : { type: Boolean, default: false},
  network      : { type: String},
  value 		   : { type: String},  //META accountId, GA accountId, ADWORD accountId, BING accountId, CRITEO accountId,SHOPIFY store_url, LEVANTA,IMPACT , AWIN, CJ,AVANTLINK authkey, PEPPERJAM authkey
	token   	   : { type: String }, //SHOPIFY accessToken, IMPACT authToken, AWIN authToken, RAKUTEN authToken, AVANTLINK authkey
	version      : { type: String }, //PEPPERJAM version
	account_name : { type: String }, //IMPACT AccountName, AWIN AccountName
	program_id   : { type: String }, //IMPACT programId
	timezone     : { type: String }, //AWIN
  is_backed_data_synced: { type: Boolean, default: false}
}, {
  timestamps: true,
  versionKey: false,
});

// Optimization: Index for bulk fetching by client_id
clientConnectionsSchema.index({ client_id: 1, network: 1, value: 1 }, { unique: true });
export default mongoose.model('client_connections', clientConnectionsSchema);