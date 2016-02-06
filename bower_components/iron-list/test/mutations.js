suite('mutations to items', function() {
      var list, container;

      setup(function() {
        container = fixture('trivialList');
        list = container.list;
      });

      test('update physical item', function(done) {
        var setSize = 100;
        var phrase = 'It works!';

        list.items = buildDataSet(setSize);

        list.set('items.0.index', phrase);

        flush(function() {
          assert.equal(getFirstItemFromList(list).textContent, phrase);
          done();
        });
      });

      test('update virtual item', function(done) {
        var setSize = 100;
        var phrase = 'It works!';

        list.items = buildDataSet(setSize);

        function scrollBackUp() {
          simulateScroll({
            list: list,
            contribution: 100,
            target: 0
          }, function() {
            flush(function() {
              assert.equal(getFirstItemFromList(list).textContent, phrase);
              done();
            });
          });
        }

        flush(function() {
          var rowHeight = list._physicalItems[0].offsetHeight;
          // scroll down
          simulateScroll({
            list: list,
            contribution: 100,
            target: setSize*rowHeight
          }, function() {
            list.set('items.0.index', phrase);
            flush(scrollBackUp);
          });
        });
      });

      test('push', function(done) {
        var setSize = 100;

        list.items = buildDataSet(setSize);
        setSize = list.items.length;

        list.push('items', buildItem(setSize));
        assert.equal(list.items.length, setSize + 1);

        flush(function() {
          var rowHeight = list._physicalItems[0].offsetHeight;
          var viewportHeight = list.offsetHeight;
          var itemsPerViewport = Math.floor(viewportHeight/rowHeight);

          assert.equal(getFirstItemFromList(list).textContent, 0);

          simulateScroll({
            list: list,
            contribution: rowHeight,
            target: list.items.length*rowHeight
          }, function() {
            assert.equal(getFirstItemFromList(list).textContent,
                list.items.length - itemsPerViewport);
            done();
          });
        })
      });

      test('pop', function(done) {
        var setSize = 100;
        list.items = buildDataSet(setSize);

        flush(function() {
          var rowHeight = list._physicalItems[0].offsetHeight;

          simulateScroll({
            list: list,
            contribution: rowHeight,
            target: setSize*rowHeight
          }, function() {
            var viewportHeight = list.offsetHeight;
            var itemsPerViewport = Math.floor(viewportHeight/rowHeight);

            list.pop('items');

            flush(function() {
              assert.equal(list.items.length, setSize-1);
              assert.equal(getFirstItemFromList(list).textContent, setSize - 3 - 1);
              done();
            });
          });
        });
      });

      test('splice', function(done) {
        var setSize = 45;
        var phrase = 'It works!'
        list.items = buildDataSet(setSize);

        list.splice('items', 0, setSize, buildItem(phrase));

        flush(function() {
          assert.equal(list.items.length, 1);
          assert.equal(getFirstItemFromList(list).textContent, phrase);
          done();
        });
      });

      test('delete item and scroll to bottom', function() {
        var setSize = 100, index;

        list.items = buildDataSet(setSize);

        while (list.items.length > 10) {
          index = parseInt(list.items.length * Math.random());
          list.arrayDelete('items',  list.items[index]);
          list.scrollToIndex(list.items.length - 1);
          assert.isTrue(/^[0-9]*$/.test(getFirstItemFromList(list).textContent));
        }
      });

    });