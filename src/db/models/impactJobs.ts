import mongoose from 'mongoose';

const impactJobsSchema = new mongoose.Schema({
	client_id : { type: mongoose.Schema.Types.ObjectId, ref:'Store', required: [true, "Client ID is required."]},
	connection_id : { type: String},
	url       : { type: String},
	job_id    : { type: String},
	type      : { type: String, enum:['transaction','publisher-list'] },
	status    : { type: String, enum:['pending','webhook-success','completed','error'] },
},
{ 
	timestamps: true,
	versionKey: false,
	collection: 'impact_jobs',
},
);

impactJobsSchema.index({ client_id: 1, job_id: 1 });
const ImpactJobs = mongoose.model("ImpactJobs",impactJobsSchema); 

export default ImpactJobs;