    var copyFrom = /^copy from "?(.+)"?/;
    var copyTo = /^copy to "?(.+)"?/;
    var renameFrom = /^rename from "?(.+)"?/;
    var renameTo = /^rename to "?(.+)"?/;
    var index = /^index ([0-9a-z]+)\.\.([0-9a-z]+)\s*(\d{6})?/;
    var combinedIndex = /^index ([0-9a-z]+),([0-9a-z]+)\.\.([0-9a-z]+)/;
    var combinedMode = /^mode (\d{6}),(\d{6})\.\.(\d{6})/;
        currentFile.isDeleted = true;
        currentFile.isNew = true;
        values[3] && (currentFile.mode = values[3]);
        currentFile.isNew = true;
        currentFile.isDeleted = true;
    if (cfg.srcPrefix) {
      prefixes.push(cfg.srcPrefix);
    }
    if (cfg.dstPrefix) {
      prefixes.push(cfg.dstPrefix);
    }
      if (matchingPrefixes[0]) {
        // Remove prefix if exists
        filename = filename.slice(matchingPrefixes[0].length);
      }