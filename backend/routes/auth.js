const router=require("express").Router(),bcrypt=require("bcryptjs"),jwt=require("jsonwebtoken"),User=require("../models/User");
const token=u=>jwt.sign({sub:u._id.toString()},process.env.JWT_SECRET,{expiresIn:`${Math.max(1,Number(process.env.TOKEN_TTL_HOURS||168))}h`});
const safe=u=>({id:u._id,name:u.name,username:u.username,email:u.email,bio:u.bio,avatarUrl:u.avatarUrl,followersCount:u.followers.length,followingCount:u.following.length});
router.post("/register",async(req,res)=>{try{
 const {name,username,email,password}=req.body;
 if(![name,username,email,password].every(v=>typeof v==="string"&&v.trim()))return res.status(400).json({message:"Please fill in every field."});
 if(password.length<8)return res.status(400).json({message:"Password must be at least 8 characters."});
 if(!/^[a-zA-Z0-9_.]{3,24}$/.test(username.trim()))return res.status(400).json({message:"Username must be 3–24 characters: letters, numbers, _ or ."});
 if(await User.findOne({$or:[{email:email.trim().toLowerCase()},{username:username.trim().toLowerCase()}]}))return res.status(409).json({message:"Email or username already registered."});
 const u=await User.create({name:name.trim(),username:username.trim().toLowerCase(),email:email.trim().toLowerCase(),passwordHash:await bcrypt.hash(password,12)});
 res.status(201).json({token:token(u),user:safe(u)});
 }catch(e){res.status(e.code===11000?409:500).json({message:e.code===11000?"Email or username already registered.":"Could not create account."});}});
router.post("/login",async(req,res)=>{try{const key=String(req.body.emailOrUsername||"").trim().toLowerCase(),password=String(req.body.password||"");
 const u=await User.findOne({$or:[{email:key},{username:key}]});
 if(!u||!(await bcrypt.compare(password,u.passwordHash)))return res.status(401).json({message:"Email/username or password is incorrect."});
 res.json({token:token(u),user:safe(u)});
 }catch{res.status(500).json({message:"Could not sign in."});}});
module.exports=router;