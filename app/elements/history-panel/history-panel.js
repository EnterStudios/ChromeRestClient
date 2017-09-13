(function() {
    'use strict';
    Polymer({
      is: 'history-panel',
      /**
       * Fired when the user clicked on export requests button.
       *
       * @event history-panel-export-items
       * @property {Array} items Array of items to be deleted
       */
      /**
       * Fired when the user clicked on delete request/s button.
       *
       * @event history-panel-delete-items
       * @property {Array} items Array of items to be deleted
       */
      /**
       * Fired when the user want to open a request.
       * @event history-panel-open-item
       * @property {String} id The doc._id of the item.
       */
      properties: {
        // Read history data.
        historyData: {
          type: Array,
          value: []
        },
        // current query options
        queryOptions: {
          type: Object,
          readOnly: true,
          value: function() {
            return {
              limit: 75,
              descending: true,
              // jscs:disable
              include_docs: true
              // jscs:enable
            };
          }
        },
        optionsState: {
          type: Number,
          value: 0
        },
        // Selected by the user elements on the lists
        currentSelection: {
          type: Array
        },
        detailedRequest: Object,
        narrowDrawer: {
          type: Boolean,
          value: true
        },
        hasSelection: {
          type: Boolean,
          compute: '_hasSelection(currentSelection.length)'
        },
        // If set the panel will show the results matched for given query.
        searchQuery: String,
        querying: {
          type: Boolean,
          readOnly: true,
          notify: true
        },
        isEmpty: {
          type: Boolean,
          value: false
        },
        opened: Boolean
      },

      behaviors: [
        ArcBehaviors.ArcFileExportBehavior,
        ArcBehaviors.DeleteRevertableBehavior
      ],

      observers: [
        '_observeSelection(hasSelection)',
        '_searchQueryChanged(searchQuery)',
        '_queryComplete(querying, historyData.length)',
        '_openedChanged(opened)'
      ],

      attached: function() {
        this.listen(window, 'datastrores-destroyed', '_onDatabaseDestroy');
      },

      detached: function() {
        this.unlisten(window, 'datastrores-destroyed', '_onDatabaseDestroy');
      },

      _onDatabaseDestroy: function(e) {
        var databases = e.detail.datastores;
        if (!databases || !databases.length) {
          return;
        }
        if (databases.indexOf('history-requests') === -1) {
          return;
        }
        var db = this._getDb();
        db.close().then(function() {
          console.log('The saved-requests database has been closed.');
        });
      },

      _openedChanged: function(opened) {
        if (opened) {
          this._searchQueryChanged('');
        } else {
          this.historyData = [];
          this.detailedRequest = undefined;
          this.currentSelection = undefined;
        }
      },

      _observeSelection: function(hasSelection) {
        if (hasSelection) {
          this.optionsState = 1;
        } else {
          this.optionsState = 0;
        }
      },

      _getDb: function() {
        return new PouchDB('history-requests');
      },

      _searchQueryChanged: function(searchQuery) {
        delete this.queryOptions.startkey;
        delete this.queryOptions.skip;
        this.set('historyData', []);
        this.query(searchQuery);
      },

      // refreshes the state of the panel.
      refresh() {
        delete this.queryOptions.startkey;
        delete this.queryOptions.skip;
        this._setQuerying(true);
        this.set('historyData', []);
        this.loadNext();
      },

      query(q) {
        if (!q) {
          return this.refresh();
        }
        q = q.toLowerCase();
        if (q[0] === '_') {
          q = q.substr(1);
        }
        let encodedQ = encodeURIComponent(q);
        var db = this._getDb();
        this._setQuerying(true);
        db.allDocs()
        .then((r) => {
          let matches = r.rows.filter((i) => i.id.indexOf(encodedQ) !== -1);
          if (!matches.length) {
            this._setQuerying(false);
            return;
          }
          var p = matches.map((i) => db.get(i.id));
          return Promise.all(p);
        })
        .then((r) => {
          this._setQuerying(false);
          if (!r) {
            return;
          }
          var ids = [];
          r.forEach((item) => {
            ids.push(item._id);
            this.push('historyData', item);
          });
          return this._fullSearch(q, ids);
        })
        .catch((e) => {
          this._setQuerying(false);
          this.fire('app-log', {
            message: ['Query history', e],
            level: 'error'
          });
          console.error('Query history', e);
        });
      },

      _fullSearch: function(q, ids) {
        this._setQuerying(true);

        var mm = Math.round(100 / q.split(/\s/).length);
        var db = this._getDb();
        return db.search({
          query: q,
          fields: ['headers', 'payload'],
          // jscs:disable
          include_docs: true,
          // jscs:enable
          mm: mm + '%'
        }).then((r) => {
          this._setQuerying(false);
          if (!r || !r.rows || !r.rows.length) {
            return;
          }
          if (ids && ids.length) {
            r.rows = r.rows.filter((i) => ids.indexOf(i.id) === -1);
          }
          if (!r.rows.length) {
            return;
          }
          r.rows.forEach((item) => {
            this.push('historyData', item.doc);
          });
          this.fire('send-analytics', {
            type: 'event',
            category: 'Search',
            action: 'Query history',
            label: 'History panel'
          });
        })
        .catch((e) => {
          this._setQuerying(false);
          this.fire('app-log', {
            message: ['Query history', e],
            level: 'error'
          });
          console.error('Query history', e);
        });
      },

      loadNext() {
        if (this.searchQuery) {
          return;
        }
        this.debounce('history-load-page', this._loadPage, 200);
      },

      _loadPage: function() {
        if (this.searchQuery) {
          return;
        }
        var db = this._getDb();
        this._setQuerying(true);
        db.allDocs(this.queryOptions)
        .then((response) => {
          if (response && response.rows.length > 0) {
            this.queryOptions.startkey =
              response.rows[response.rows.length - 1].key;
            this.queryOptions.skip = 1;
            let res = response.rows.map((i) => i.doc);
            res = this._processResults(res);
            res.forEach((item) => {
              this.push('historyData', item);
            });
          }
          this._setQuerying(false);
        })
        .catch((e) => {
          this._setQuerying(false);
          this.fire('app-log', {
            message: ['Query history', e],
            level: 'error'
          });
          console.error('Query history', e);
        });
      },

      _processResults: function(res) {
        res = res.map((item) => {
          if (!item.updated || item.updated !== item.updated) {
            if (item.created && item.created === item.created) {
              item.updated = item.created;
            } else {
              item.updated = Date.now();
            }
          }
          return item;
        });
        // sort by updated
        res.sort((a, b) => {
          if (a.updated > b.updated) {
            return -1;
          }
          if (a.updated < b.updated) {
            return 1;
          }
          return 0;
        });
        var days = [];
        res = res.map((item) => {
          let d = this._computeHistoryTime(item._id.split('/')[0]);
          if (days.indexOf(d) === -1) {
            days[days.length] = d;
            item.hasHeader = true;
            item.header = d;
          }
          return item;
        });
        return res;
      },

      _computeHistoryTime: function(date) {
        var d = new Date(Number(date));
        var _t = d.getTime();
        if (_t !== _t) {
          return '';
        }
        var options = {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        };
        return new Intl.DateTimeFormat(undefined, options).format(d);
      },

      _selectionChanged: function(e) {
        var r = e.detail.item;
        if (e.detail.selected) {
          this.detailedRequest = r;
          this.narrowDrawer = false;
          this.$.details.openDrawer();
        } else {
          if (this.detailedRequest === r) {
            this.closeDetailsPanel();
            this.detailedRequest = null;
          }
        }
      },

      closeDetailsPanel: function() {
        this.narrowDrawer = true;
        this.$.details.closeDrawer();
      },

      _onOpenRequested: function(e) {
        this.fire('history-panel-open-item', {
          id: e.detail.item._id
        });
      },

      _hasSelection(length) {
        return !!length;
      },

      _onDeleteRequested: function(e) {
        this.deleteItems([e.detail.item]);
      },

      _deleteSelected: function() {
        if (!this.currentSelection ||
          !this.currentSelection.length) {
          this.$.noSelectionToast.open();
          return;
        }
        this.deleteItems(this.currentSelection);
      },

      _exportSelected: function() {
        if (!this.currentSelection ||
          !this.currentSelection.length) {
          this.$.noSelectionToast.open();
          return;
        }
        var copy = this.currentSelection.map((i) =>  Object.assign({}, i));
        copy.forEach((i) => {
          delete i.hasHeader;
          delete i.header;
        });
        this.exportContent = arc.app.importer.createExportObject({
          history: copy,
          type: 'history'
        });
        var date = new Date();
        var day = date.getDate();
        var year = date.getFullYear();
        var month = date.getMonth() + 1;
        this.fileSuggestedName = 'arc-export-' + day + '-' + month + '-' + year + '-saved.json';
        this.exportMime = 'json';
        this.exportData();
        this.fire('send-analytics', {
          type: 'event',
          category: 'Data export',
          action: 'Selected history as file',
          label: 'History panel'
        });
      },

      deleteItems: function(items) {
        this._deleteRevertable('history-requests', items)
        .then((res) => {
          let items = res.map((i) => i.id);
          this.fire('request-objects-deleted', {
            items: items,
            type: 'history-requests'
          });
          var data = this.historyData;
          data = data.filter((i) => items.indexOf(i._id) === -1);
          this.set('historyData', data);
        })
        .catch((e) => {
          StatusNotification.notify({
            message: 'Error deleting entries. ' + e.message
          });
          this.fire('app-log', {
            message: ['Error deleting entries', e],
            level: e
          });
          console.error(e);
        });
      },

      _onDocumentsRestored: function(response) {
        var docs = response.rows.map((i) => i.doc);
        var res = this.historyData.concat(docs);
        res = this._processResults(res);
        this.set('historyData', res);
        this.fire('request-objects-restored', {
          items: docs,
          type: 'history'
        });

        this.fire('send-analytics', {
          type: 'event',
          category: 'Data delete',
          action: 'Restore deleted from toast',
          label: 'History panel'
        });
      },

      _cmputeIsSearch: function(searchQuery) {
        return !!searchQuery;
      },

      warnClearAll: function() {
        this.$.dataClearDialog.opened = true;
      },

      onClearDialogResult: function(e, detail) {
        if (!detail.confirmed) {
          return;
        }
        var db = this._getDb();
        db.destroy()
        .catch((e) => {
          StatusNotification.notify({
            message: 'Error deleting database. ' + e.message
          });
          this.fire('app-log', {
            message: ['Error deleting database', e],
            level: e
          });
          console.error(e);
        })
        .then(() => {
          this.fire('request-objects-cleared', {
            type: 'history'
          });
          this.refresh();
        });
      },

      _computeOptionsTableClass: function(optionsState) {
        var clazz = 'table-options';
        clazz += (optionsState === 0 ? ' inactive' : '');
        return clazz;
      },

      _queryComplete: function(querying, length) {
        var state = false;
        if (!querying && !length) {
          state = true;
        }
        this.set('isEmpty', state);
      },

      // _checkDataIntegrity: function() {
      //   chrome.storage.local.get({
      //     'history-panel.data-integrity.checked': false
      //   }, (data) => {
      //     this.async(() => {
      //       if (data['history-panel.data-integrity.checked'] === 'false' ||
      //         data['history-panel.data-integrity.checked'] === false) {
      //         // this.__controllUpdatedProperty();
      //       }
      //     }, 2000);
      //     // chrome.storage.local.set({'history-panel.data-integrity.checked': true}, () => {});
      //   });
      // },

      __controllUpdatedProperty: function() {
        var db = new PouchDB('history-requests');
        db.allDocs({
          // jscs:disable
          include_docs: true
          // jscs:enable
        })
        .then((result) => {
          var promises = result.rows.map((item) => {
            let changed = false;
            if (!item.doc.updated || item.doc.updated !== item.doc.updated) {
              if (item.doc.created && item.doc.created === item.doc.created) {
                item.doc.updated = item.doc.created;
              } else {
                item.doc.updated = Date.now();
              }
              changed = true;
            }
            if (changed) {
              return db.put(item.doc);
            }
            return Promise.resolve();
          });
          return Promise.all(promises);
        })
        .then(() => {
          console.log('Alright, should be OK now.');
        })
        .catch((e) => {
          console.error('Too much data to handle, I guess.', e);
        });
      }
    });
  })();
