
var gOmData  = null;
var gRefData = null;

var gCurSpec = {filename: "current.root"};
var gRefSpec = {filename: "reference.root"};

// Open data files according the provided arguments on the URL.
$(function(){
  // Decode parameters from URL path!
  // Look for start of path.
  var url =window.location.pathname.replace(/^.*\/Argoom/,"");
  console.log(url);

  // Try to find run numbers.
  var vars = url.split(/[\s,_\-\/]/);
  console.log(vars);
  function isNumber(n) { return !isNaN(parseFloat(n)) && isFinite(n);}
  var vals =[];
  for(var i=0;i<vars.length;i++) {
    if(isNumber(vars[i])) vals.push(vars[i]) ;
  }
  console.log("vals:",vals);
  var s;
  if(undefined !== (s = vals.shift())) { gCurSpec = {run: parseInt(s)} }
  if(undefined !== (s = vals.shift())) { gCurSpec.subrun = parseInt(s);}
  if(undefined !== (s = vals.shift())) { gRefSpec = {run: parseInt(s)} }
  if(undefined !== (s = vals.shift())) { gRefSpec.subrun = parseInt(s);}
  
  // Decode parameters from URL parameters
  var urlparams = $.deparam.querystring();
  if(urlparams.filename) gCurSpec = {filename: urlparams.filename};
  if(urlparams.reffile ) gRefSpec = {filename: urlparams.reffile};

  if(urlparams.run)     gCurSpec = {run: urlparams.run};
  if(urlparams.refrun ) gRefSpec = {run: urlparams.refrun};
  if(urlparams.subrun)     gCurSpec.subrun= urlparams.subrun;
  if(urlparams.refsubrun ) gRefSpec.subrun= urlparams.refsubrun;  
  
 console.log(urlparams,"Attempting new OmDataObj gets with gCurSpec=",gCurSpec," and gRefSpec=",gRefSpec);
  gOmData  = new OmDataObj(gCurSpec,true);
  gRefData = new OmDataObj(gRefSpec,false);
  
});

function OmDataObj(dataspec, primary)
{
  this.paths = [];
  this.dataspec = dataspec;
  this.status = "uninitialized";  
  $.event.trigger({ type: "OmDataChangeState", state: this.status}) ;
  this.primary = primary;
  this.event_to_emit = "OmDataRecieved";
  if(!this.primary) this.event_to_emit = "OmRefDataRecieved";
}


OmDataObj.prototype.add = function(path)
{
  // Ensure not a duplicate entry.
  if( $.inArray(path,this.paths)==-1)
    this.paths.push(path);

  console.log("OmDataObj::add",this.paths);
}

OmDataObj.prototype.remove = function(path)
{
  this.paths = $.grep(this.paths,function(elem,index){
    return elem !==path;
  });
  console.log("OmDataObj::remove",this.paths);
  
}

OmDataObj.prototype.getObj = function(path)
{
  // Pull a specific path out of the results.
  if(!this.data) return null;
  if(!this.data.record) return null;
  if(!this.data.record.shipment) return null;
  if(!this.data.record.shipment[path]) return null;
  return this.data.record.shipment[path];
}

OmDataObj.prototype.getCycle = function(path)
{
  // Pull a specific path out of the results.
  if(!this.data) return null;
  if(!this.data.record) return null;
  if(!this.data.record.cycle) return null;
  return this.data.record.cycle;
}



OmDataObj.prototype.get = function()
{
  console.log("OmDataObj::get",this.paths);
  
  this.myurl = "server/serve_hists.cgi"; // Note relative url.
  var opts = ":";
  if($("input.ctl-low-resolution").is(":checked")){ opts = ":lowres128:"; }
  console.log("lowres check",$("input.ctl-low-resolution").is(":checked"),opts);
  
  var p = $.extend({}
    ,this.dataspec
    ,{
      hists: this.paths.join(':'),
      options: opts    
  })
  this.param = $.param(p);
  
  console.log("Requesting data:",this.myurl+"?"+this.param);

  var self = this;
  var req = $.ajax({
          type: "GET",
          url: this.myurl,
          data: this.param,
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          async: true,
          error:    function(){self.QueryError()},
          success:  function(data,textStatus,jqxhr){self.QuerySuccess(data,textStatus,jqxhr)},
        }); 
        console.log(req);
  this.status = "getting";
  $.event.trigger({ type: "OmDataChangeState", state: this.status}) ;
}

OmDataObj.prototype.QueryError = function()
{
  this.status = "error";
  $.event.trigger({ type: "OmDataChangeState", state: this.status}) ;
}

OmDataObj.prototype.QuerySuccess = function(data,textStatus,jqxhr)
{
  this.status = "success";
  $.event.trigger({ type: "OmDataChangeState", state: this.status}) ;
  this.data = data;
  var bad=false;
  if(data.error) { bad = true; this.status = data.error; }
  if(data.record && data.record.error) { bad = true; this.status = data.record.error; }
  if(bad) {
    console.warn("Got error when retrieving data: "+this.status);
    $.event.trigger({
      type: "OmDataChangeState",
      msg: "Backend error: "+data.error
    }) ;
    return;
  }

  console.log("Got data on ",this.dataspec,". Triggering.");
  $.event.trigger({type: this.event_to_emit}) ;

}

