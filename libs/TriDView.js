//
// Code for the Arachne Event Display
// Author: Nathaniel Tagg ntagg@otterbein.edu
// 
// Licence: this code is free for non-commertial use. Note other licences may apply to 3rd-party code.
// Any use of this code must include attribution to Nathaniel Tagg at Otterbein University, but otherwise 
// you're free to modify and use it as you like.
//

//
// Objects and functions to build a 3-d display using custom Pad3d.
//

// Automatic runtime configuration.
// I should probably abstract this another level for a desktop-like build...
$(function(){
  $('div.A-TriDView').each(function(){
    var o = new TriDView(this);
  });  
});

var gTriDView = null;

// Subclass of Pad.
TriDView.prototype = new Pad3d;           

function TriDView( element, options ){
  // console.log('TriDView ctor');
  if(!element) {
    // console.log("TriDView: NULL element supplied.");
    return;
  }
  if($(element).length<1) { 
    // console.log()
    return;   
  }
  gTriDView = this;
  
  var settings = {
    default_look_at:    [128.175,
                         0  ,
                         518.4  ],
    default_camera_distance: 1300,
    camera_distance_max: 8000,
    camera_distance_min: 50,
    default_theta: -0.224,
    default_phi: 5.72,
  }
  $.extend(true,settings,options);  // Change default settings by provided qualities.
  Pad3d.call(this, element, settings); // Give settings to Pad contructor.


  // Data model state.
  gStateMachine.Bind('recordChange',this.Rebuild.bind(this));
  gStateMachine.Bind('hoverChange',this.HoverChange.bind(this));

  var self = this;
 
 
  this.ctl_show_hits    =  GetBestControl(this.element,".show-hits");
  this.ctl_show_clus    =  GetBestControl(this.element,".show-clus");
  this.ctl_show_spoints =  GetBestControl(this.element,".show-spoints");
  this.ctl_show_tracks  =  GetBestControl(this.element,".show-tracks");
  this.ctl_show_mc      =  GetBestControl(this.element,".show-mc");

  $(this.ctl_show_hits).change(function(ev) { return self.Rebuild(); });
  $(this.ctl_show_clus).change(function(ev) { return self.Rebuild(); });
  $(this.ctl_show_spoints).change(function(ev) { return self.Rebuild(); });
  $(this.ctl_show_tracks) .change(function(ev) { return self.Rebuild(); });
  $(this.ctl_show_mc     ).change(function(ev) { return self.Rebuild(); });

  $('#ctl-TrackLists') .change(function(ev) { return self.Rebuild(); });
  $('#ctl-SpacepointLists').change(function(ev) { return self.Rebuild(); });
 
 
  this.ResetView();
}

TriDView.prototype.HoverChange = function()
{
  // Only need a redraw if the over change affected something we care about.
  switch(gHoverState.type) {
    case "hit": 
    case "cluster":
    case "spacepoint":
    case "track":
    case "mcparticle":
      this.Draw(); break;
    default: break;
  }
  switch(gHoverState.last.type) {
    case "hit": 
    case "cluster":
    case "spacepoint":
    case "track":
    case "mcparticle":
      this.Draw(); break;
    default: break;  
  }
}


TriDView.prototype.Rebuild = function ()
{
  // console.debug('TriD::Rebuild()');

  this.objects = [];
  
  this.CreateFrame();
  if(!gRecord) return;

  if ($(this.ctl_show_hits).is(":checked"))    this.CreateHits();
  if ($(this.ctl_show_clus).is(":checked"))    this.CreateClusters();
  if ($(this.ctl_show_spoints).is(":checked")) this.CreateSpacepoints();
  if ($(this.ctl_show_tracks ).is(":checked")) this.CreateTracks();
  if ($(this.ctl_show_mc     ).is(":checked")) this.CreateMC();
  
  this.Draw();
}


TriDView.prototype.CreateFrame = function()
{
  // console.log("TriDView CreateFrame.");
  
  /// Simple frame.
  // console.log("Creating frame");
  
  var dx = 128.175*2;
  var dz = 518.4  *2;

  var dy = 116.5; // half-length
  
  // All coords are in cm.
  var curColor = "rgba(50, 50, 255, 1)";
  this.AddLine( 0, -dy, 0,  dx,-dy, 0,   3, curColor);
  this.AddLine( dx,-dy, 0,  dx, dy, 0,   3, curColor);
  this.AddLine( dx, dy,0,  0 ,  dy, 0,   3, curColor);
  this.AddLine( 0 ,-dy, 0,  0 , dy, 0,   3, curColor);
                                         3
  this.AddLine( 0, -dy, dz,  dx,-dy, dz, 3, curColor);
  this.AddLine( dx,-dy, dz,  dx, dy, dz, 3, curColor);
  this.AddLine( dx, dy,dz,   0 , dy, dz, 3, curColor);
  this.AddLine( 0 ,-dy, dz,  0 , dy, dz, 3, curColor);
                                         3
  this.AddLine( 0,-dy, 0 ,  0 ,-dy, dz,  3, curColor);
  this.AddLine(dx,-dy, 0 , dx ,-dy, dz,  3, curColor);
  this.AddLine( 0, dy, 0 ,  0 , dy, dz,  3, curColor);
  this.AddLine(dx, dy, 0 ,  dx, dy, dz,  3, curColor);

  // Optical detectors.
  var dets = gGeo.opDets.opticalDetectors;
  this.ctx.strokeStyle = "black";
  for(var i=0;i<dets.length;i++){
    var det = dets[i];
    var hov = {obj: det, type: "opdet", collection: gGeo.opDets.opticalDetectors};

    this.AddArcYZ(det.x,det.y,det.z,15.2,20,0,Math.PI*2,1,curColor,hov);
  }
  
  
  
}

TriDView.prototype.CreateHits = function()
{
  if(!gHitsListName) return;
  var hits = gRecord.hits[gHitsListName];

  var cs = new ColorScaler();  
  cs.max = 2000;

  for(var i=0;i<hits.length;i++) {
    var h = hits[i];    
    var hovobj = {obj:h, type:"hit", collection: hits};    

    if(h.t1 > gZoomRegion.tdc[1]) continue;
    if(h.t2 < gZoomRegion.tdc[0]) continue;
    var gwire = gGeo.getWire(h.plane,h.wire);
    var c = cs.GetColor(h.q);
    var color = "rgba(" + c + ",0.2)";
    var x = gGeo.getXofTDC(h.plane,h.t);
    // if(h.view<2) continue;
    this.AddLine(x, gwire.y1, gwire.z1, x, gwire.y2, gwire.z2, 2, color, hovobj);    
  }
}

TriDView.prototype.CreateClusters = function()
{
  
}


TriDView.prototype.CreateTracks = function()
{
  if(!$("#ctl-TrackLists").val()) return;
  var tracks = gRecord.tracks[$("#ctl-TrackLists").val()];
  console.warn(tracks,gRecord.tracks,$("#ctl-TrackLists").val());
  for(itrk in tracks) {
    var trk = tracks[itrk];
    console.log(trk);
    var hovobj = {obj:trk, type:"track", collection: tracks};    
    var points = trk.points;
    for(var i=0;i<points.length-1;i++) {

      var curColor = "rgba(89, 169, 28, 1)";
      var p1 = points[i];
      var p2 = points[i+1];
      this.AddLine(p1.x,p1.y,p1.z, p2.x,p2.y,p2.z, 3, curColor, hovobj);
    }
  }
}

TriDView.prototype.CreateSpacepoints = function()
{  
  if(!$("#ctl-SpacepointLists").val()) return;
  var spacepoints = gRecord.spacepoints[$("#ctl-SpacepointLists").val()];
  for(var i=0;i<spacepoints.length;i++) {
    var sp = spacepoints[i];
    var hovobj = {obj:sp, type:"spacepoint", collection: spacepoints};    
    
    var curColor = "rgba(0, 150, 150, 1)";
    this.AddLine(sp.xyz[0], sp.xyz[1], sp.xyz[2],sp.xyz[0], sp.xyz[1], sp.xyz[2]+0.3, 2, curColor, hovobj);
  }
}

TriDView.prototype.CreateMC = function()
{
  if(!gRecord) return;
  if(!gRecord.mc) return;
  if(!gMCParticlesListName) return;
  var particles = gRecord.mc.particles[gMCParticlesListName];
  if(!particles) return;
  for(var i=0;i<particles.length;i++)
  {
    var p= particles[i];
    var t = p.trajectory[0].t;
    if(t>1.6e6 || t<-1000) continue; // Ignore out-of-time particles
    console.log("TriDView::CreateMC particle at time ",t, p.trajectory.length);
    var hovobj = {obj:p, type:"mcparticle", collection: particles};
    if(!p.trajectory || p.trajectory.length==0) continue;
    
    var lineWidth = 1;
    var curColor = "rgba(0,0,255,0.5)";
    

    if(p.fpdgCode == 22 || p.fpdgCode == 2112) {
      // Make photons and neutrons colorless.
      curColor = "rgba(0,0,0,0)";      
    }
    // for(var k=0;k<gSelectedTrajectories.length;k++) {
    //   if(p.ftrackId == gSelectedTrajectories[k]) {
    //     lineWidth = 2;
    //     curColor = "rgba(255,255,20,1)";        
    //   }
    // }
    
    for(var j=1;j<p.trajectory.length;j++) {
      var p1 = p.trajectory[j-1];
      var p2 = p.trajectory[j];

      this.AddLine(p1.x,p1.y,p1.z, p2.x,p2.y,p2.z, 2, curColor, hovobj);
    }
  }
 
}
  


TriDView.prototype.should_highlight = function(obj)
{
  if(!obj.source) return false;
  if(!obj.source.obj) return false;
  if(! gHoverState.obj) return false;
  if((obj.source.obj == gHoverState.obj) 
    || ((obj.source.obj.ftrackId)&&(obj.source.obj.ftrackId == gHoverState.obj.ftrackId))) 
    return true;
  return false;
}

TriDView.prototype.should_outline = function(obj)
{
  if(!obj.source) return false;
  if(!obj.source.obj) return false;
  if(! gSelectState.obj) return false;
  if((obj.source.obj == gSelectState.obj) 
    || ((obj.source.obj.ftrackId)&&(obj.source.obj.ftrackId == gSelectState.obj.ftrackId))) {
      return true;      
    }
  return false;
}

TriDView.prototype.DrawFinish = function()
{
  if(this.fMouseInContentArea) {
    if(this.final_highlight_point){      
      var offset = getAbsolutePosition(this.canvas);
      var pt = this.final_highlight_point;
      // Pick rightmost alternative.
      if(pt[0] < this.begin_highlight_point[0]) pt = this.begin_highlight_point;
      SetOverlayPosition(offset.x + pt[0], offset.y + pt[1]);  
    }
  }
}

TriDView.prototype.HoverObject = function(selected)
{
  ClearHover();
  if(selected) {
    ChangeHover(selected);
  }
  //this.Draw();
}

TriDView.prototype.ClickObject = function(selected)
{
  console.warn("trid click");
  if(selected) ChangeSelection(selected);
  else ClearSelection();
  //this.Draw();
}

