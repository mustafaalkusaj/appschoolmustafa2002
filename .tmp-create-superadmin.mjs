import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(p){const o={};if(!fs.existsSync(p))return o;for(const l of fs.readFileSync(p,"utf8").split(/\r?\n/)){if(!l||l.trim().startsWith("#"))continue;const i=l.indexOf("=");if(i<0)continue;o[l.slice(0,i).trim().replace(/^﻿/,"")]=l.slice(i+1).trim();}return o;}
const env={...loadEnv(".env.local"),...process.env};
const supabase=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});

const EMAIL=process.env.NEW_EMAIL;
const PASSWORD=process.env.NEW_PASSWORD;
const FULL_NAME=process.env.NEW_NAME||"System Owner";

async function findByEmail(email){
  let page=1;const per=200;
  for(;;){const{data,error}=await supabase.auth.admin.listUsers({page,perPage:per});if(error)throw error;const u=(data?.users||[]).find(x=>x.email?.toLowerCase()===email.toLowerCase());if(u)return u;if((data?.users||[]).length<per)return null;page++;}
}

let user=await findByEmail(EMAIL);
if(user){
  console.log("ℹ️ المستخدم موجود مسبقًا — سيتم تحديث كلمة المرور والدور.");
  const{data,error}=await supabase.auth.admin.updateUserById(user.id,{password:PASSWORD,email_confirm:true});
  if(error)throw error;user=data.user;
}else{
  const{data,error}=await supabase.auth.admin.createUser({email:EMAIL,password:PASSWORD,email_confirm:true,user_metadata:{seeded:true}});
  if(error)throw error;user=data.user;
}

const{error:pErr}=await supabase.from("user_profiles").upsert({
  id:user.id,email:user.email,full_name:FULL_NAME,role:"super_admin",school_id:null,is_active:true
},{onConflict:"id"});
if(pErr)throw pErr;

// verify
const{data:prof}=await supabase.from("user_profiles").select("id,email,role,is_active,school_id").eq("id",user.id).single();
console.log("✅ تم إنشاء/تأكيد حساب السوبر أدمن:");
console.log(JSON.stringify(prof,null,2));
