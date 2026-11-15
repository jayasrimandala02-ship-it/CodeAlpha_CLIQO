const jwt=require("jsonwebtoken"),User=require("../models/User");
module.exports=async function requireAuth(req,res,next){
 try{const h=req.headers.authorization||"",token=h.startsWith("Bearer ")?h.slice(7):null;
 if(!token)return res.status(401).json({message:"Please sign in first."});
 const data=jwt.verify(token,process.env.JWT_SECRET),user=await User.findById(data.sub).select("-passwordHash");
 if(!user)return res.status(401).json({message:"Account not found."});req.user=user;next();
 }catch{return res.status(401).json({message:"Session expired. Please sign in again."});}
};