loaded_h_0(function(_){var window=this;
_.v("ESrPQc");
_.Uli=new _.Zf(_.x3a);
_.x();
_.Yli=_.y("PsPAfd",[_.x3a,_.A3a]);
_.v("PsPAfd");
var $li=function(a,b,c){b!==0&&(a.oa.has(b)?a.oa.get(b).push(c):a.oa.set(b,[c]))},ami=class{constructor(a){this.oa=a}};var bmi=async function(a,{Pjb:b,Cg:c,productViewerMetadata:d,kE:e,Brb:f=""}){var g=(0,_.Wf)(),h=g();g=g(1);try{let k=_.B(a.oa,4)?g(await h(a.Aa())):[],l={Cg:c,Pjb:b,iOe:_.Hj(a.oa,7),productViewerMetadata:d,YRe:k,kE:e,Brb:f,rmb:a};g(await h(a.rma.WDb(l)))}finally{h()}},cmi=class extends _.Ns{static Ta(){return{jsdata:{UHd:_.Zli},service:{rma:_.Uli,c$a:_.Vli}}}constructor(a){super(a.Na);this.Aa=async()=>_.oh(this.oa,_.mT,1,_.ph()).length?_.oh(this.oa,_.mT,1,_.ph(_.$i)):Promise.all(Array.from(this.getRoot().el().querySelectorAll("[data-pv-entrypoint]"),
b=>this.Ic(b,_.ep))).then(b=>b.map(c=>c.Bc()));this.rma=a.service.rma;this.c$a=a.service.c$a;this.oa=_.p(a.jsdata.UHd,_.wT,1);this.flags=a.jsdata.UHd.QL();this.rma.gEe(this.flags);this.Ba=new ami(this.Aa);$li(this.c$a,_.Hj(this.oa,7),this.Ba);this.addOnDisposeCallback(()=>{var b=this.c$a,c=_.Hj(this.oa,7),d=this.Ba;c!==0&&b.oa.has(c)&&(b=b.oa.get(c),d=b.indexOf(d,0),d>-1&&b.splice(d,1))})}async Ca(a){var b=(0,_.Wf)(),c=b();b=b(1);try{let d,e=((d=a.data)==null?void 0:d.kE)||a.targetElement,f,g=((f=
a.data)==null?void 0:f.Cg)||_.Ve(this.Ja("B1641c").el()),h,k=((h=a.data)==null?void 0:h.Brb)||"",l=this.Bc(a);if(!l)return!0;b(await c(bmi(this,{Pjb:!1,Cg:g,productViewerMetadata:l,kE:e,Brb:k})))}finally{c()}}async Da(a){var b=(0,_.Wf)(),c=b();b=b(1);try{let d=a.data.hOe,e=a.data.query,f=_.Ve(this.getRoot().el()),g=null,h=b(await c(this.Aa()));for(let k of h){let l=(new _.wli(e,k)).getKey();if(d.getKey()===l){g=k;break}}g&&b(await c(bmi(this,{Pjb:!0,Cg:f,kE:a.targetElement,productViewerMetadata:g})))}finally{c()}}Bc(a){var b;
if((b=a.data)==null?0:b.productViewerMetadata)return a.data.productViewerMetadata;b=a.targetElement;a:switch(_.vm(b.getData("pvgMetadataKey"))){case 1:a=1;break a;case 2:a=2;break a;default:a=0}b=_.qm(b.getData("pvgMetadataValue"));if(a!==0&&b)for(let d of _.oh(this.oa,_.mT,1,_.ph())){a:{switch(a){case 1:var c=_.fh(d,1);break a;case 2:c=_.fh(d,2);break a}c=void 0}if(c===b)return d}return null}};cmi.prototype.$wa$bCGqS=function(){return this.Da};cmi.prototype.$wa$egvsmc=function(){return this.Ca};
_.Ps(_.Yli,cmi);
_.x();
});
// Google Inc.
