import mongoose from 'mongoose';

const publishersSchema = new mongoose.Schema({
	client_id            : { type: mongoose.Schema.Types.ObjectId, ref:'Store', required: [true, "Client ID is required."]},
	group_publisher_id   : { type: String },
	group_publisher_name : { type: String },
	publisher_id         : { type: String },
	publisher_name       : { type: String},
	publisher_url        : { type: String},
	tag 				 : { type: String },
	network 		     : { type: String },
	status 		         : { type: String, enum:['active','inactive','deleted'], default:'active' },
	revenue 		     : { type: Number},
	clicks 		         : { type: Number},
	impact_group         : { type: String },
},
{ 
	timestamps: true,
	versionKey: false,
	collection: 'affiliate_publishers',
},
);

publishersSchema.index({ client_id: 1 , network: 1 , publisher_id: 1 });
const AffiliatePublishers = mongoose.model("AffiliatePublishers",publishersSchema); 

export default AffiliatePublishers;