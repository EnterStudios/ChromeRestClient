(function() {
  'use strict';
  /**
  @license
  Copyright 2016 Pawel Psztyc, The ARC team

  Licensed under the Apache License, Version 2.0 (the "License"); you may not
  use this file except in compliance with the License. You may obtain a copy of
  the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
  License for the specific language governing permissions and limitations under
  the License.
  */
  window.ArcBehaviors = window.ArcBehaviors || {};
  /**
   * Behavior for common functions between saved and history controllers.
   *
   * ## Sorting a list
   * To set a sort option for page query set `sortBy` and `sortDirections` i nthe element that
   * use this behavior.
   *
   * @polymerBehavior ArcBehaviors.RequestsListControllerBehavior
   */
  window.ArcBehaviors.RequestsListControllerBehaviorImpl = {
    properties: {
      /**
       * Model's key to sort on.
       */
      sortBy: {
        type: String,
        notify: true
      },
      /**
       * Selected sort direction.
       * Can be either `acs` for natural order or `desc` for reversed order.
       */
      sortDirection: {
        type: String,
        notify: true
      },
      /**
       * True if the component is showning in the UI.
       *
       * @type Boolean
       */
      isShowing: {
        type: Boolean,
        value: false
      },

      toolbarFeatures: {
        type: Array,
        value: ['search', 'clearAll', 'export']
      }
    },
    observers: [
      '_sortChanged(sortBy, sortDirection)'
    ],
    onShow: function() {
      this.searchQuery = '';
      this.isShowing = true;
    },
    onHide: function() {
      this.searchQuery = '';
      this.isShowing = false;
      window.setTimeout(function() {
        this.resetQuery();
      }.bind(this), 250);
      this.resetView();
    },
    
    queryPage: function() {
      console.warn('Remove me?');
    },

    _dataRead: function(e) {
      var list = e.detail.data;
      if (list) {
        list.forEach((item) => item.selected = false);
      }
      this.appendResults(list);
    },

    /** User requested to clear all entries. */
    _clearDataStore: function() {
      this.$.deleteModel.objectId = null;
      this.$.deleteModel.data = null;
      this.$.deleteModel.forceDeleteAll = true;
      this.$.deleteModel.remove();
    },
    /**
     * The user requested to export selected items.
     * List of selection is in e.detail.data.
     */
    _onExportRequested: function(e) {
      var items = e.detail.data;
      if (!items) {
        return;
      }

      var event = this.fire('export-create-object', {
        types: {
          requests: items
        }
      }, {
        cancelable: true,
        composed: true
      });
      if (!event.defaultPrevented) {
        throw new Error('Export module not found.');
      }
      var date = new Date();
      var day = date.getDate();
      var year = date.getFullYear();
      var month = date.getMonth() + 1;
      var file = 'arc-export-' + day + '-' + month + '-' + year + '-export.json';

      var exportData = event.detail.result;
      event = this.fire('export-data', {
        data: exportData,
        type: 'application/json',
        file: file
      }, {
        cancelable: true
      });
      if (!event.defaultPrevented) {
        throw new Error('Export module not found.');
      }
      this.fire('send-analytics', {
        type: 'event',
        category: 'Data export',
        action: 'Saved as file'
      });
    },

    onFileSaved: function() {
      this.exportContent = null;
    },

    onFileError: function() {
      this.exportContent = null;
    },
    /**
     * The user requested to delete selected items.
     * List of selection is in e.detail.data.
     */
    _onDeleteRequested: function(e) {
      var items = e.detail.data;
      if (!items) {
        return;
      }
      this.removedCopy = Array.from(items);
      this.$.deleteModel.data = items;
      this.$.deleteModel.remove();

      this.fire('send-analytics', {
        type: 'event',
        category: 'Data delete',
        action: 'Delete saved list'
      });
    },

    _selectedRemoveError: function(e) {
      this.removedCopy = null;
      this.fire('app-log', {
        'message': '_selectedRemoveError: ' + e.message,
        stack: e.stack,
        'level': 'error'
      });
      StatusNotification.notify({
        message: 'Unable remove data from storage.'
      });
      this.fire('send-analytics', {
        type: 'exception',
        description: 'DeleteSavedSelected' + e.detail.message,
        fatal: false
      });
    },

    _selectedRemoved: function() {
      if (!this.removedCopy) {
        //removed all
        this.set('listData', []);
        this.$.model.data = null;
        this.resetQuery();
        return;
      }
      this.removedCopy.forEach((item) => {
        for (var i = 0; i < this.listData.length; i++) {
          if (this.listData[i].id === item.id) {
            this.splice('listData', i, 1);
            break;
          }
        }
      });
      this.view.$.selector.clearSelection();
      StatusNotification.notify({
        message: 'Removed selected items.',
        timeout: StatusNotification.TIME_MEDIUM,
        actionName: 'Revert'
      }, function() {
        this._revertDeleted();
      }.bind(this));
    },
    _revertDeleted: function() {
      this.$.saveModel.data = this.removedCopy;

      this.fire('send-analytics', {
        type: 'event',
        category: 'Data delete',
        action: 'Restore deleted from toast'
      });
    },
    _requestSaved: function() {
      if (this.removedCopy) {
        var view = this.view;
        this.removedCopy.forEach((item) => {
          this.push('listData', item);
          view.$.selector.select(item);
        });
        view.$.requestList.render();
      }
      this.removedCopy = null;
    },
    _viewScrolling: function(e) {
      if (!this.isShowing) {
        return;
      }
      this.computeScroll(e.target.scroller);
    },

    _sortChanged: function() {
      if (!this.isShowing) {
        return;
      }
      this.fire('send-analytics', {
        type: 'event',
        category: 'Engagement',
        action: 'Sort change',
        label: 'Request list'
      });
    },

    onClearAll: function() {
      if (this.view) {
        this.view.warnClearAll();
        this.fire('send-analytics', {
          type: 'event',
          category: 'Data delete',
          action: 'Clear all requested'
        });
      } else {
        // new System.
        this.warnClearAll();
      }
    },
    openDrive: function() {
      var ctrl = document.querySelector('#driveController');
      if (!ctrl) {
        return;
      }
      ctrl.selectFile();
    },

    onExport: function() {
      var type = this.dataset.route;
      var date = new Date();
      var day = date.getDate();
      var year = date.getFullYear();
      var month = date.getMonth() + 1;

      var event = this.fire('export-user-data', {
        type: type,
        file: 'arc-export-' + day + '-' + month + '-' + year + '-' + type + '.json'
      }, {
        cancelable: true,
        composed: true
      });

      if (!event.defaultPrevented) {
        StatusNotification.notify({
          message: 'Unable to export data :(',
          timeout: StatusNotification.TIME_MEDIUM
        });
        throw new Error('Export element not found.');
      }
      this.fire('send-analytics', {
        type: 'event',
        category: 'Data export',
        action: 'Export saved as file'
      });

      event.detail.result.then(data => {
        console.log(data);
        StatusNotification.notify({
          message: 'Implement me!',
          timeout: StatusNotification.TIME_MEDIUM
        });
      });
    },

    resetView: function() {

    },

    warnClearAll: function() {}
  };
  window.ArcBehaviors.RequestsListControllerBehavior = [
    ArcBehaviors.ListControllerBehavior,
    ArcBehaviors.RequestsListControllerBehaviorImpl
  ];
})();
