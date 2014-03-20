//
// Functions to handle micrboone json data.
//

// Global bookmarks into data record.
gCurObjNames = {
  raw: null,
  cal: null,
};
gHitsListName = null;
gMCParticlesListName = null;
gMCTruthListName = null;
gOpPulsesListName = null;

function DoInitialBookmarking()
{
  gCurName = {
    raw: null,
    cal: null,
  };
  gHitsListName = null;
  gOphitsListName=null;
  gOpflashesListName=null;
  gOpPulsesListName=null;
  gMCParticlesListName = null;
  gMCTruthListName = null;
  
  gSelectedTrack = null;
  
  
  
  if(gRecord.raw) {
    for(var i in gRecord.raw) { // element can be set to null; just key exists if not loaded.
      if(gRecord.raw[i] && gRecord.raw[i].wireimg_url) {gCurName.raw = i; break;}
    }
  }

  if(gRecord.cal) {
    for(var i in gRecord.cal) { 
      if(gRecord.cal[i] && gRecord.cal[i].wireimg_url) {gCurName.cal =i; break;}
    }
  }


  $('#ctl-HitLists').empty();
  if(gRecord.hits) {
    for(var i in gRecord.hits) { 
      $('#ctl-HitLists').append("<option value='"+i+"'>"+i.replace(/^[^_]*_/,"")+"</option>");
      if(gRecord.hits[i].length > 0) gHitsListName = i; // Select the first list that has nonzero entries.
    }
  }

  $('#ctl-ClusterLists').empty();
  if(gRecord.clusters) {
    for(var i in gRecord.clusters) { 
      $('#ctl-ClusterLists').append("<option value='"+i+"'>"+i.replace(/^[^_]*_/,"")+"</option>");
    }
  }

  $('#ctl-EndpointLists').empty();
  if(gRecord.endpoint2d) {
    for(var i in gRecord.endpoint2d) { 
      $('#ctl-EndpointLists').append("<option value='"+i+"'>"+i.replace(/^[^_]*_/,"")+"</option>");
    }
  }


  $('#ctl-SpacepointLists').empty();
  for(var i in gRecord.spacepoints) { 
    // Sanitize name a little: remove everything before and including first underscore.
    $('#ctl-SpacepointLists').append("<option value='"+i+"'>"+i.replace(/^[^_]*_/,"")+"</option>");
  }

  $('#ctl-TrackLists').empty();
  for(var i in gRecord.tracks) { 
    $('#ctl-TrackLists').append("<option value='"+i+"'>"+i.replace(/^[^_]*_/,"")+"</option>");
  }
  
  if(gRecord.oppulses) {
    for(var i in gRecord.oppulses) { 
      gOpPulsesListName = i;
      if(gRecord.oppulses[i].length > 0) break; // Select the first list that has nonzero entries.
    }
  }

  if(gRecord.ophits) {
    for(var i in gRecord.ophits) { 
      gOphitsListName = i;
      if(gRecord.ophits[i].length > 0) break; // Select the first list that has nonzero entries.
    }
  }

  if(gRecord.opflashes) {
    for(var i in gRecord.opflashes) { 
      gOpflashesListName = i;
      if(gRecord.opflashes[i].length > 0) break; // Select the first list that has nonzero entries.
    }
  }

  if(gRecord.mc) {
    if(gRecord.mc.gtruth) {
      for(var i in gRecord.mc.gtruth) { 
        gMCTruthListName = i;
        if(gRecord.mc.gtruth[i].length > 0) break; // Select the first list that has nonzero entries.
      }
    }

    if(gRecord.mc.particles) {
      for(var i in gRecord.mc.particles) { 
        gMCParticlesListName = i;
        if(gRecord.mc.particles[i].length > 0) break; // Select the first list that has nonzero entries.
      }
    }
    
  }

}