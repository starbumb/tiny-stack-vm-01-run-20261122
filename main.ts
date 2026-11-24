import*as F from'node:fs'
let A=new Int8Array(256).fill(-1),H="01146:;?99999995999599999904400584414"
for(let o=0,j=0;o<84;o++)if(o<8|o>15&o<35&o!=31|o>47&o<53|o==64|o==65|o>79)A[o]=H.charCodeAt(j++)-48
let V=(P,N)=>{let D=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),U=new Uint8Array(65536),s=0,c=0,l=0,q=0,p=0,t=0,n=P.length,e=0
try{for(;;){
if(t>999999)throw 10
if(p<0|p>=n)throw 9
let o=P[p],h=A[o],i=o==1?1:o==2?4:o>47&o<52?2:0
if(h<0)throw 5
if(p+i>=n)throw 9
t++
let x=p+1+i
if(s<(h>>2))throw 2
if(s-(h>>2)+(h&3)>256)throw 3
p=x
if(o==1)D[s++]=(P[x-1]<<24)>>24
else if(o==2)D[s++]=P[x-4]|P[x-3]<<8|P[x-2]<<16|P[x-1]<<24
else if(o>15&o<35&o!=23&o!=27){let b=D[s-1],a=D[s-2]
if(o>18&o<23&!b)throw 4
D[s-2]=o==16?a+b|0:o==17?a-b|0:o==18?Math.imul(a,b):o==19?a/b|0:o==20?a%b|0:o==21?Math.floor((a>>>0)/(b>>>0))|0:o==22?(a>>>0)%(b>>>0)|0:o==24?a&b:o==25?a|b:o==26?a^b:o==28?a<<b:o==29?a>>b:o==30?a>>>b|0:o==32?(a==b?1:0):o==33?(a<b?1:0):a>>>0<b>>>0?1:0
s--}
else if(o==0)throw 0
else if(o==3)s--
else if(o==4)D[s]=D[s-1],s++
else if(o==5){let a=D[s-1];D[s-1]=D[s-2];D[s-2]=a}
else if(o==6)D[s]=D[s-2],s++
else if(o==7){let a=D[s-3];D[s-3]=D[s-2];D[s-2]=D[s-1];D[s-1]=a}
else if(o==23)D[s-1]=-D[s-1]|0
else if(o==27)D[s-1]=~D[s-1]
else if(o>47&o<51){let r=((P[x-2]|P[x-1]<<8)<<16)>>16
if(o==48||(o==49)==(D[--s]==0))p=x+r}
else if(o==51){if(c>63)throw 7;C[c++]=x;p=P[x-2]|P[x-1]<<8}
else if(o==52){if(!c)throw 8;p=C[--c]}
else if(o==64){let a=D[s-1];if(a<0|a>255)throw 6;D[s-1]=M[a]}
else if(o==65){let a=D[s-1];if(a<0|a>255)throw 6;M[a]=D[s-2];s-=2}
else if(o==80){let w=String(D[s-1])
if(l+w.length>65536)throw 11
s--
for(let k=0;k<w.length;)U[l++]=w.charCodeAt(k++)}
else if(o==81){if(l>65535)throw 11;U[l++]=D[--s]&255}
else if(o==82)D[s++]=q<N.length?N[q++]:-1
else throw D[--s]&255
}}catch(z){e=z}
return[U.slice(0,l),e]}
let I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output',g=f=>{try{return F.readFileSync(f)}catch{return new Uint8Array(0)}}
for(let d of F.readdirSync(I)){let r=V(g(I+'/'+d+'/program.bin'),g(I+'/'+d+'/input.bin'))
F.mkdirSync(O+'/'+d,{recursive:!0})
F.writeFileSync(O+'/'+d+'/stdout.bin',r[0])
F.writeFileSync(O+'/'+d+'/exit.txt',r[1]+'\n')}
