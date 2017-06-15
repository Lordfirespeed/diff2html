      checkDiffSample(diff);
      checkDiffSample(diff);
      checkDiffSample(diff);
      checkDiffSample(diff);
      var result = DiffParser.generateDiffJson(diff, {'srcPrefix': '\t', 'dstPrefix': '\t'});
    it('should parse unified non git diff and strip timestamps off the headers', function() {
      var diff =
        '--- a/sample.js	2016-10-25 11:37:14.000000000 +0200\n' +
        '+++ b/sample.js	2016-10-25 11:37:14.000000000 +0200\n' +
        '@@ -1 +1,2 @@\n' +
        '-test\n' +
        '+test1r\n' +
        '+test2r\n';

      var result = DiffParser.generateDiffJson(diff);
      var file1 = result[0];
      assert.equal(1, result.length);
      assert.equal(2, file1.addedLines);
      assert.equal(1, file1.deletedLines);
      assert.equal('sample.js', file1.oldName);
      assert.equal('sample.js', file1.newName);
      assert.equal(1, file1.blocks.length);

      var linesContent = file1.blocks[0].lines.map(function(line) {
        return line.content;
      });
      assert.deepEqual(linesContent, ['-test', '+test1r', '+test2r']);
    });

    it('should parse unified diff with multiple hunks and files', function() {
      var diff =
        '--- sample.js\n' +
        '+++ sample.js\n' +
        '@@ -1 +1,2 @@\n' +
        '-test\n' +
        '@@ -10 +20,2 @@\n' +
        '+test\n' +
        '--- sample1.js\n' +
        '+++ sample1.js\n' +
        '@@ -1 +1,2 @@\n' +
        '+test1';

      var result = DiffParser.generateDiffJson(diff);
      assert.equal(2, result.length);

      var file1 = result[0];
      assert.equal(1, file1.addedLines);
      assert.equal(1, file1.deletedLines);
      assert.equal('sample.js', file1.oldName);
      assert.equal('sample.js', file1.newName);
      assert.equal(2, file1.blocks.length);

      var linesContent1 = file1.blocks[0].lines.map(function(line) {
        return line.content;
      });
      assert.deepEqual(linesContent1, ['-test']);

      var linesContent2 = file1.blocks[1].lines.map(function(line) {
        return line.content;
      });
      assert.deepEqual(linesContent2, ['+test']);

      var file2 = result[1];
      assert.equal(1, file2.addedLines);
      assert.equal(0, file2.deletedLines);
      assert.equal('sample1.js', file2.oldName);
      assert.equal('sample1.js', file2.newName);
      assert.equal(1, file2.blocks.length);

      var linesContent = file2.blocks[0].lines.map(function(line) {
        return line.content;
      });
      assert.deepEqual(linesContent, ['+test1']);
    });

    it('should parse diff with --- and +++ in the context lines', function() {
      var diff =
        '--- sample.js\n' +
        '+++ sample.js\n' +
        '@@ -1,8 +1,8 @@\n' +
        ' test\n' +
        ' \n' +
        '-- 1\n' +
        '--- 1\n' +
        '---- 1\n' +
        ' \n' +
        '++ 2\n' +
        '+++ 2\n' +
        '++++ 2';

      var result = DiffParser.generateDiffJson(diff);
      var file1 = result[0];
      assert.equal(1, result.length);
      assert.equal(3, file1.addedLines);
      assert.equal(3, file1.deletedLines);
      assert.equal('sample.js', file1.oldName);
      assert.equal('sample.js', file1.newName);
      assert.equal(1, file1.blocks.length);

      var linesContent = file1.blocks[0].lines.map(function(line) {
        return line.content;
      });
      assert.deepEqual(linesContent,
        [' test', ' ', '-- 1', '--- 1', '---- 1', ' ', '++ 2', '+++ 2', '++++ 2']);
    });

    it('should parse diff without proper hunk headers', function() {
      var diff =
        '--- sample.js\n' +
        '+++ sample.js\n' +
        '@@ @@\n' +
        ' test';

      var result = DiffParser.generateDiffJson(diff);
      var file1 = result[0];
      assert.equal(1, result.length);
      assert.equal(0, file1.addedLines);
      assert.equal(0, file1.deletedLines);
      assert.equal('sample.js', file1.oldName);
      assert.equal('sample.js', file1.newName);
      assert.equal(1, file1.blocks.length);

      var linesContent = file1.blocks[0].lines.map(function(line) {
        return line.content;
      });
      assert.deepEqual(linesContent, [' test']);
    });

    it('should parse binary file diff', function() {
      var diff =
        'diff --git a/last-changes-config.png b/last-changes-config.png\n' +
        'index 322248b..56fc1f2 100644\n' +
        '--- a/last-changes-config.png\n' +
        '+++ b/last-changes-config.png\n' +
        'Binary files differ';

      var result = DiffParser.generateDiffJson(diff);
      var file1 = result[0];
      assert.equal(1, result.length);
      assert.equal(0, file1.addedLines);
      assert.equal(0, file1.deletedLines);
      assert.equal('last-changes-config.png', file1.oldName);
      assert.equal('last-changes-config.png', file1.newName);
      assert.equal(1, file1.blocks.length);
      assert.equal(0, file1.blocks[0].lines.length);
      assert.equal('Binary files differ', file1.blocks[0].header);
    });

    it('should parse diff with --find-renames', function() {
      var diff =
        'diff --git a/src/test-bar.js b/src/test-baz.js\n' +
        'similarity index 98%\n' +
        'rename from src/test-bar.js\n' +
        'rename to src/test-baz.js\n' +
        'index e01513b..f14a870 100644\n' +
        '--- a/src/test-bar.js\n' +
        '+++ b/src/test-baz.js\n' +
        '@@ -1,4 +1,32 @@\n' +
        ' function foo() {\n' +
        '-var bar = "Whoops!";\n' +
        '+var baz = "Whoops!";\n' +
        ' }\n' +
        ' ';

      var result = DiffParser.generateDiffJson(diff);
      var file1 = result[0];
      assert.equal(1, result.length);
      assert.equal(1, file1.addedLines);
      assert.equal(1, file1.deletedLines);
      assert.equal('src/test-bar.js', file1.oldName);
      assert.equal('src/test-baz.js', file1.newName);
      assert.equal(1, file1.blocks.length);
      assert.equal(5, file1.blocks[0].lines.length);
      var linesContent = file1.blocks[0].lines.map(function(line) {
        return line.content;
      });
      assert.deepEqual(linesContent,
        [' function foo() {', '-var bar = "Whoops!";', '+var baz = "Whoops!";', ' }', ' ']);
    });

    it('should parse diff with prefix', function() {
      var diff =
        'diff --git "\tTest.scala" "\tScalaTest.scala"\n' +
        'similarity index 88%\n' +
        'rename from Test.scala\n' +
        'rename to ScalaTest.scala\n' +
        'index 7d1f9bf..8b13271 100644\n' +
        '--- "\tTest.scala"\n' +
        '+++ "\tScalaTest.scala"\n' +
        '@@ -1,6 +1,8 @@\n' +
        ' class Test {\n' +
        ' \n' +
        '   def method1 = ???\n' +
        '+\n' +
        '+  def method2 = ???\n' +
        ' \n' +
        '   def myMethod = ???\n' +
        ' \n' +
        '@@ -10,7 +12,6 @@ class Test {\n' +
        ' \n' +
        '   def + = ???\n' +
        ' \n' +
        '-  def |> = ???\n' +
        ' \n' +
        ' }\n' +
        ' \n' +
        'diff --git "\ttardis.png" "\ttardis.png"\n' +
        'new file mode 100644\n' +
        'index 0000000..d503a29\n' +
        'Binary files /dev/null and "\ttardis.png" differ\n' +
        'diff --git a/src/test-bar.js b/src/test-baz.js\n' +
        'similarity index 98%\n' +
        'rename from src/test-bar.js\n' +
        'rename to src/test-baz.js\n' +
        'index e01513b..f14a870 100644\n' +
        '--- a/src/test-bar.js\n' +
        '+++ b/src/test-baz.js\n' +
        '@@ -1,4 +1,32 @@\n' +
        ' function foo() {\n' +
        '-var bar = "Whoops!";\n' +
        '+var baz = "Whoops!";\n' +
        ' }\n' +
        ' ';

      var result = DiffParser.generateDiffJson(diff, {'srcPrefix': '\t', 'dstPrefix': '\t'});
      assert.equal(3, result.length);

      var file1 = result[0];
      assert.equal(2, file1.addedLines);
      assert.equal(1, file1.deletedLines);
      assert.equal('Test.scala', file1.oldName);
      assert.equal('ScalaTest.scala', file1.newName);
      assert.equal(2, file1.blocks.length);
      assert.equal(8, file1.blocks[0].lines.length);
      assert.equal(7, file1.blocks[1].lines.length);

      var file2 = result[1];
      assert.equal('/dev/null', file2.oldName);
      assert.equal('tardis.png', file2.newName);

      var file3 = result[2];
      assert.equal(1, file3.addedLines);
      assert.equal(1, file3.deletedLines);
      assert.equal('src/test-bar.js', file3.oldName);
      assert.equal('src/test-baz.js', file3.newName);
      assert.equal(1, file3.blocks.length);
      assert.equal(5, file3.blocks[0].lines.length);
      var linesContent = file3.blocks[0].lines.map(function(line) {
        return line.content;
      });
      assert.deepEqual(linesContent,
        [' function foo() {', '-var bar = "Whoops!";', '+var baz = "Whoops!";', ' }', ' ']);
    });

    it('should parse binary with content', function() {
      var diff =
        'diff --git a/favicon.png b/favicon.png\n' +
        'deleted file mode 100644\n' +
        'index 2a9d516a5647205d7be510dd0dff93a3663eff6f..0000000000000000000000000000000000000000\n' +
        'GIT binary patch\n' +
        'literal 0\n' +
        'HcmV?d00001\n' +
        '\n' +
        'literal 471\n' +
        'zcmeAS@N?(olHy`uVBq!ia0vp^0wB!61|;P_|4#%`EX7WqAsj$Z!;#Vf<Z~8yL>4nJ\n' +
        'za0`Jj<E6WGe}IBwC9V-A&PAz-C7Jno3L%-fsSJk3`UaNzMkcGzh!g=;$beJ?=ckpF\n' +
        'zCl;kLIHu$$r7E~(7NwTw7iAYKI0u`(*t4mJfq_xq)5S5wqIc=!hrWj$cv|<b{x!c(\n' +
        'z;3r#y;31Y&=1q>qPVOAS4ANVKzqmCp=Cty@U^(7zk!jHsvT~YI{F^=Ex6g|gox78w\n' +
        'z+Sn2Du3GS9U7qU`1*NYYlJi3u-!<?H-eky}wyIIL;8VU@wCDrb0``&v(jQ*DWSR4K\n' +
        'zPq(3;isEyho{emNa=%%!jDPE`l3u;5d=q=<+v8kO-=C`*G#t-*AiE-D>-_B#8k9H0\n' +
        'zGl{FnZs<2$wz5^=Q2h-1XI^s{LQL1#T4epqNPC%Orl(tD_@!*EY++~^Lt2<2&!&%=\n' +
        'z`m>(TYj6uS7jDdt=eH>iOyQg(QMR<-Fw8)Dk^ZG)XQTuzEgl{`GpS?Cfq9818R9~=\n' +
        'z{&h9@9n8F^?|qusoPy{k#%tVHzu7H$t26CR`BJZk*Ixf&u36WuS=?6m2^ho-p00i_\n' +
        'I>zopr0Nz-&lmGw#\n' +
        'diff --git a/src/test-bar.js b/src/test-baz.js\n' +
        'similarity index 98%\n' +
        'rename from src/test-bar.js\n' +
        'rename to src/test-baz.js\n' +
        'index e01513b..f14a870 100644\n' +
        '--- a/src/test-bar.js\n' +
        '+++ b/src/test-baz.js\n' +
        '@@ -1,4 +1,32 @@\n' +
        ' function foo() {\n' +
        '-var bar = "Whoops!";\n' +
        '+var baz = "Whoops!";\n' +
        ' }\n' +
        ' ';

      var result = DiffParser.generateDiffJson(diff);
      assert.equal(2, result.length);

      var file1 = result[0];
      assert.equal('favicon.png', file1.oldName);
      assert.equal('favicon.png', file1.newName);
      assert.equal(1, file1.blocks.length);
      assert.equal(0, file1.blocks[0].lines.length);

      var file2 = result[1];
      assert.equal(1, file2.addedLines);
      assert.equal(1, file2.deletedLines);
      assert.equal('src/test-bar.js', file2.oldName);
      assert.equal('src/test-baz.js', file2.newName);
      assert.equal(1, file2.blocks.length);
      assert.equal(5, file2.blocks[0].lines.length);
      var linesContent = file2.blocks[0].lines.map(function(line) {
        return line.content;
      });
      assert.deepEqual(linesContent,
        [' function foo() {', '-var bar = "Whoops!";', '+var baz = "Whoops!";', ' }', ' ']);
    });