import { initializeApp } from 'firebase/app';
import { getAuth,browserLocalPersistence,setPersistence,GoogleAuthProvider,FacebookAuthProvider,signInWithPopup,signInWithCredential,linkWithCredential,linkWithPopup,EmailAuthProvider,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,updateProfile,signOut,type Auth,type User } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
const env=import.meta.env;
export const firebaseConfigured=!!(env.VITE_FIREBASE_API_KEY&&env.VITE_FIREBASE_PROJECT_ID&&env.VITE_FIREBASE_AUTH_DOMAIN&&env.VITE_FIREBASE_APP_ID);
export const auth:Auth|null=firebaseConfigured?getAuth(initializeApp({apiKey:env.VITE_FIREBASE_API_KEY,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,projectId:env.VITE_FIREBASE_PROJECT_ID,appId:env.VITE_FIREBASE_APP_ID})):null;
const persistence=auth?setPersistence(auth,browserLocalPersistence):Promise.resolve();
if(auth)auth.languageCode='vi';
function requireAuth(){if(!auth)throw new Error('Chưa cấu hình Firebase. Bạn có thể chơi khách hoặc làm bước Firebase trong hướng dẫn.');return auth;}
export async function emailLogin(email:string,password:string,register:boolean,name:string){
 const a=requireAuth();await persistence;
 const result=register?await createUserWithEmailAndPassword(a,email,password):await signInWithEmailAndPassword(a,email,password);
 if(register){await updateProfile(result.user,{displayName:name});await sendEmailVerification(result.user);}
 return result.user;
}
export async function socialLogin(provider:'google'|'facebook',link=false){
 const a=requireAuth();await persistence;const user=a.currentUser;
 if(link&&!user)throw new Error('Đăng nhập trước khi liên kết tài khoản.');
 if(!Capacitor.isNativePlatform()){
  const p=provider==='google'?new GoogleAuthProvider():new FacebookAuthProvider();
  return link?linkWithPopup(user!,p):signInWithPopup(a,p);
 }
 if(provider==='facebook'&&!(env.VITE_NATIVE_FACEBOOK_ENABLED==='true'))throw new Error('Facebook Android chưa được cấu hình. Điền FACEBOOK_APP_ID / FACEBOOK_CLIENT_TOKEN, VITE_NATIVE_FACEBOOK_ENABLED=true rồi sync Android.');
 const result=provider==='google'?await FirebaseAuthentication.signInWithGoogle():await FirebaseAuthentication.signInWithFacebook();
 const c=result.credential;
 const credential=provider==='google'?GoogleAuthProvider.credential(c?.idToken??null,c?.accessToken??null):FacebookAuthProvider.credential(c?.accessToken??'');
 return link?linkWithCredential(user!,credential):signInWithCredential(a,credential);
}
export async function linkPassword(email:string,password:string){const a=requireAuth();if(!a.currentUser)throw new Error('Chưa đăng nhập.');await linkWithCredential(a.currentUser,EmailAuthProvider.credential(email,password));if(!a.currentUser.emailVerified)await sendEmailVerification(a.currentUser);}
export async function verifyAgain(){const user=requireAuth().currentUser;if(!user)throw new Error('Chưa đăng nhập.');await user.reload();await user.getIdToken(true);return user;}
export async function sendVerification(){const user=requireAuth().currentUser;if(!user)throw new Error('Chưa đăng nhập.');await sendEmailVerification(user);}
export async function resetPassword(email:string){if(!email)throw new Error('Nhập email ở ô phía trên trước.');await sendPasswordResetEmail(requireAuth(),email);}
export async function logout(){localStorage.removeItem('snake.guest');if(auth)await signOut(auth);if(Capacitor.isNativePlatform()&&firebaseConfigured)await FirebaseAuthentication.signOut().catch(()=>{});localStorage.removeItem('snake.guest');}
export async function userToken(user:User|null){return user?await user.getIdToken():localStorage.getItem('snake.guest')??'';}
export function authError(error:unknown){
 const code=(error as {code?:string})?.code;
 const messages:Record<string,string>={
 'auth/invalid-credential':'Email hoặc mật khẩu không đúng.',
 'auth/email-already-in-use':'Email này đã có tài khoản. Hãy đăng nhập rồi liên kết phương thức trong Hồ sơ.',
 'auth/weak-password':'Mật khẩu cần ít nhất 6 ký tự.',
 'auth/invalid-email':'Địa chỉ email chưa hợp lệ.',
 'auth/popup-closed-by-user':'Bạn đã đóng cửa sổ đăng nhập.',
 'auth/popup-blocked':'Trình duyệt chặn popup. Cho phép popup rồi thử lại.',
 'auth/account-exists-with-different-credential':'Email này đã đăng ký bằng phương thức khác. Đăng nhập bằng phương thức cũ rồi vào Hồ sơ để liên kết.',
 'auth/credential-already-in-use':'Phương thức này đã gắn với tài khoản khác.',
 'auth/provider-already-linked':'Phương thức này đã được liên kết.',
 'auth/unauthorized-domain':'Thêm domain hiện tại vào Firebase Authentication → Settings → Authorized domains.',
 'auth/operation-not-allowed':'Chưa bật phương thức đăng nhập trong Firebase.',
 'auth/too-many-requests':'Bạn thao tác quá nhanh. Hãy thử lại sau.',
 'auth/network-request-failed':'Không kết nối được dịch vụ đăng nhập.'};
 return code&&messages[code]?messages[code]:(error instanceof Error?error.message:'Có lỗi xảy ra.');
}
