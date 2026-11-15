const mongoose=require("mongoose");
const comment=new mongoose.Schema({author:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},text:{type:String,required:true,trim:true,maxlength:500}},{timestamps:true});
const schema=new mongoose.Schema({
 author:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
 text:{type:String,default:"",trim:true,maxlength:2000},
 mediaUrl:{type:String,default:"",trim:true},mediaType:{type:String,enum:["none","image","video"],default:"none"},
 likes:[{type:mongoose.Schema.Types.ObjectId,ref:"User"}],comments:[comment]
},{timestamps:true});
module.exports=mongoose.model("Post",schema);