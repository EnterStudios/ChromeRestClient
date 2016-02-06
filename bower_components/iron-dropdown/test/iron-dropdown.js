function elementIsVisible(element) {
      var contentRect = element.getBoundingClientRect();
      var computedStyle = window.getComputedStyle(element);

      return computedStyle.display !== 'none' &&
        contentRect.width > 0 &&
        contentRect.height > 0;
    }

    suite('<iron-dropdown>', function() {
      var dropdown;
      var content;

      suite('basic', function() {
        setup(function() {
          dropdown = fixture('TrivialDropdown');
          content = Polymer.dom(dropdown).querySelector('.dropdown-content');
        });

        test('effectively hides the dropdown content', function() {
          expect(elementIsVisible(content)).to.be.equal(false);
        });

        test('shows dropdown content when opened', function(done) {
          dropdown.open();

          Polymer.Base.async(function() {
            expect(elementIsVisible(content)).to.be.equal(true);
            done();
          });
        });

        test('hides dropdown content when outside is clicked', function(done) {
          dropdown.open();

          Polymer.Base.async(function() {
            expect(elementIsVisible(content)).to.be.equal(true);

            // The document capture-click listeners are set async.
            // Note(noms): I think this bit in iron-overlay-behavior is pretty
            // brittle, so if the tests start failing in the future, make sure
            // _toggleListeners is getting called at the right time.
            Polymer.Base.async(function() {
              MockInteractions.tap(dropdown.parentNode);
              Polymer.Base.async(function() {
                expect(elementIsVisible(content)).to.be.equal(false);
                done();
              }, 100);
            }, 1);
          });
        });

        suite('when content is focusable', function() {
          setup(function() {
            dropdown = fixture('FocusableContentDropdown');
            content = Polymer.dom(dropdown).querySelector('.dropdown-content');
          });
          test('focuses the content when opened', function(done) {
            dropdown.open();

            Polymer.Base.async(function() {
              expect(document.activeElement).to.be.equal(content);
              done();
            });
          });

          test('focuses a configured focus target', function(done) {
            var focusableChild = Polymer.dom(content).querySelector('div[tabindex]');
            dropdown.focusTarget = focusableChild;

            dropdown.open();

            Polymer.Base.async(function() {
              expect(document.activeElement).to.not.be.equal(content);
              expect(document.activeElement).to.be.equal(focusableChild);
              done();
            });
          });
        });
      });

      suite('locking scroll', function() {
        var dropdown;

        setup(function() {
          dropdown = fixture('NonLockingDropdown');
        });

        test('can be disabled with `allowOutsideScroll`', function(done) {
          dropdown.open();

          Polymer.Base.async(function() {
            expect(Polymer.IronDropdownScrollManager.elementIsScrollLocked(document.body))
              .to.be.equal(false);
            done();
          });
        });
      });

      suite('aligned dropdown', function() {
        var parent;
        setup(function() {
          parent = fixture('AlignedDropdown');
          dropdown = parent.querySelector('iron-dropdown');
        });

        test('can be re-aligned to the right and the top', function(done) {
          var parentRect;
          var dropdownRect;

          dropdown.opened = true;

          Polymer.Base.async(function() {
            dropdownRect = dropdown.getBoundingClientRect();
            parentRect = parent.getBoundingClientRect();

            // NOTE(cdata): IE10 / 11 have minor rounding errors in this case,
            // so we assert with `closeTo` and a tight threshold:
            expect(dropdownRect.top).to.be.closeTo(parentRect.top, 0.1);
            expect(dropdownRect.right).to.be.closeTo(parentRect.right, 0.1);
            done();
          }, 1);
        });

        test('can be re-aligned to the bottom', function(done) {
          var parentRect;
          var dropdownRect;

          dropdown.verticalAlign = 'bottom';
          dropdown.opened = true;

          Polymer.Base.async(function() {
            parentRect = parent.getBoundingClientRect();
            dropdownRect = dropdown.getBoundingClientRect();

            // NOTE(cdata): IE10 / 11 have minor rounding errors in this case,
            // so we assert with `closeTo` and a tight threshold:
            expect(dropdownRect.bottom).to.be.closeTo(parentRect.bottom, 0.1);
            expect(dropdownRect.right).to.be.closeTo(parentRect.right, 0.1);
            done();
          }, 1);
        });
      });

      suite('when align is left/top, with an offset', function() {
        var dropdownRect;
        var offsetDropdownRect;
        var dropdown;
        setup(function() {
          var parent = fixture('OffsetDropdownTopLeft');
          dropdown = parent.querySelector('iron-dropdown');
        });

        test('can be offset towards the bottom right', function(done) {
          dropdown.opened = true;

          Polymer.Base.async(function() {
            dropdownRect = dropdown.getBoundingClientRect();

            dropdown.verticalOffset = 10;
            dropdown.horizontalOffset = 10;
            offsetDropdownRect = dropdown.getBoundingClientRect();

            // verticalAlign is top, so a positive offset moves down.
            expect(dropdownRect.top + 10).to.be.closeTo(offsetDropdownRect.top, 0.1);
            // horizontalAlign is left, so a positive offset moves to the right.
            expect(dropdownRect.left + 10).to.be.closeTo(offsetDropdownRect.left, 0.1);
            done();
          }, 1);
        });

        test('can be offset towards the top left', function(done) {
          dropdown.opened = true;

          Polymer.Base.async(function() {
            dropdownRect = dropdown.getBoundingClientRect();

            dropdown.verticalOffset = -10;
            dropdown.horizontalOffset = -10;
            offsetDropdownRect = dropdown.getBoundingClientRect();

            // verticalAlign is top, so a negative offset moves up.
            expect(dropdownRect.top - 10).to.be.closeTo(offsetDropdownRect.top, 0.1);
            // horizontalAlign is left, so a negative offset moves to the left.
            expect(dropdownRect.left - 10).to.be.closeTo(offsetDropdownRect.left, 0.1);
            done();
          }, 1);
        });
      });

      suite('when align is right/bottom, with an offset', function() {
        var dropdownRect;
        var offsetDropdownRect;
        var dropdown;
        setup(function() {
          var parent = fixture('OffsetDropdownBottomRight');
          dropdown = parent.querySelector('iron-dropdown');
        });

        test('can be offset towards the top left', function(done) {
          dropdown.opened = true;

          Polymer.Base.async(function() {
            dropdownRect = dropdown.getBoundingClientRect();

            dropdown.verticalOffset = 10;
            dropdown.horizontalOffset = 10;
            offsetDropdownRect = dropdown.getBoundingClientRect();

            // verticalAlign is bottom, so a positive offset moves up.
            expect(dropdownRect.bottom - 10).to.be.closeTo(offsetDropdownRect.bottom, 0.1);
            // horizontalAlign is right, so a positive offset moves to the left.
            expect(dropdownRect.right - 10).to.be.closeTo(offsetDropdownRect.right, 0.1);
            done();
          }, 1);
        });

        test('can be offset towards the bottom right', function(done) {
          dropdown.opened = true;

          Polymer.Base.async(function() {
            dropdownRect = dropdown.getBoundingClientRect();

            dropdown.verticalOffset = -10;
            dropdown.horizontalOffset = -10;
            offsetDropdownRect = dropdown.getBoundingClientRect();

            // verticalAlign is bottom, so a negative offset moves down.
            expect(dropdownRect.bottom + 10).to.be.closeTo(offsetDropdownRect.bottom, 0.1);
            // horizontalAlign is right, so a positive offset moves to the right.
            expect(dropdownRect.right + 10).to.be.closeTo(offsetDropdownRect.right, 0.1);
            done();
          }, 1);
        });
      });

      suite('RTL', function() {
        var dropdown;
        var dropdownRect;

        test('with horizontalAlign=left', function(done) {
          var parent = fixture('RTLDropdownLeft');
          dropdown = parent.querySelector('iron-dropdown');
          dropdown.open();

          Polymer.Base.async(function() {
            // In RTL, if `horizontalAlign` is "left", that's the same as
            // being right-aligned in LTR. So the dropdown should be in the top
            // right corner.
            dropdownRect = dropdown.getBoundingClientRect();
            expect(dropdownRect.top).to.be.equal(0);
            expect(dropdownRect.right).to.be.equal(100);
            done();
          });
        });

        test('with horizontalAlign=right', function(done) {
          var parent = fixture('RTLDropdownRight');
          dropdown = parent.querySelector('iron-dropdown');
          dropdown.open();

          Polymer.Base.async(function() {
            // In RTL, if `horizontalAlign` is "right", that's the same as
            // being left-aligned in LTR. So the dropdown should be in the top
            // left corner.
            dropdownRect = dropdown.getBoundingClientRect();
            expect(dropdownRect.top).to.be.equal(0);
            expect(dropdownRect.left).to.be.equal(0);
            done();
          });
        });
      });
    });