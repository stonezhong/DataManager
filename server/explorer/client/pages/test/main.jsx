import React from 'react';
import ReactDOM from 'react-dom';
import $ from 'jquery';

import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';

import {get_app_context} from '/common_lib';

import {TestAlertBox}               from '/components/generic/alert/test.jsx';
import {TestTopMessage}             from '/components/generic/top_message/test.jsx';
import {TestSimpleDialogBox}        from '/components/generic/dialogbox/test_simple.jsx';
import {TestDataTable}              from '/components/generic/datatable/test.jsx';
import {TestTreeTable}              from '/components/generic/datatable/test.jsx';
import {TestPageHeader}             from '/components/generic/page_tools/test.jsx';
import {TestAppIcon}                from '/components/generic/icons/test.jsx';

import {TestDatasetEditor}          from '/components/business/dataset/test_dataset_editor.jsx';
import {TestDatasetTable}           from '/components/business/dataset/test_dataset_table.jsx';
import {TestSchemaViewer}           from '/components/business/dataset/test_schema_viewer.jsx';

import {TestTimerTable}             from '/components/business/timer/test.jsx';
import {TestApplicationEditor}      from '/components/business/application/test.jsx';
import {TestPipelineGroupEditor}    from '/components/business/pipeline_group/test.jsx';
import {TestPipelineTable}          from '/components/business/pipeline/test_pipeline_table.jsx';
import {TestPipelineEditor}         from '/components/business/pipeline/test_pipeline_editor.jsx';
import {TestTaskEditor}             from '/components/business/pipeline/test_task_editor.jsx';
import {TestSQLStepEditor}          from '/components/business/pipeline/test_sql_step_editor.jsx';

import "./test.scss";

const _ = require("lodash");

class TestPage extends React.Component {
    testClasses = [
        {
            category    : "generic",
            component   : "alert",
            classname   : "AlertBox",
            create      : () => <TestAlertBox />,
            tested: "2020-11-13"
        },
        {
            category    : "generic",
            component   : "top_message",
            classname   : "TopMessage",
            create      : () => <TestTopMessage />,
            tested: "2020-11-13"
        },
        {
            category    : "generic",
            component   : "dialogbox",
            classname   : "SimpleDialogBox",
            create      : () => <TestSimpleDialogBox />,
            tested: "2020-11-13"
        },
        {
            category    : "generic",
            component   : "datatable",
            classname   : "DataTable",
            create      : () => <TestDataTable />,
            tested: "2020-11-13"
        },
        {
            category    : "generic",
            component   : "datatable",
            classname   : "TreeTable",
            create      : () => <TestTreeTable />,
            tested: "2021-04-03"
        },
        {
            category    : "generic",
            component   : "page_tools",
            classname   : "PageHeader",
            create      : () => <TestPageHeader />,
            tested: "2021-04-03"
        },
        {
            category    : "generic",
            component   : "icons",
            classname   : "AppIcon",
            create      : () => <TestAppIcon />,
            tested: "2021-04-03"
        },
        {
            category    : "business",
            component   : "dataset",
            classname   : "DatasetEditor",
            create      : () => <TestDatasetEditor />,
            tested: "2020-11-13"
        },
        {
            category    : "business",
            component   : "dataset",
            classname   : "DatasetTable",
            create      : () => <TestDatasetTable />,
            tested: "2020-11-22"
        },
        {
            category    : "business",
            component   : "dataset",
            classname   : "SchemaViewer",
            create      : () => <TestSchemaViewer />,
            tested: "2020-11-13"
        },
        {
            category    : "business",
            component   : "pipeline",
            classname   : "SQLStepEditor",
            create      : () => <TestSQLStepEditor />,
            tested: "??"
        },
        {
            category    : "business",
            component   : "pipeline",
            classname   : "TaskEditor",
            create      : () => <TestTaskEditor />,
            tested: "??"
        },
        {
            category    : "business",
            component   : "pipeline",
            classname   : "PipelineEditor",
            create      : () => <TestPipelineEditor />,
            tested: "??"
        },
        {
            category    : "business",
            component   : "pipeline",
            classname   : "PipelineTable",
            create      : () => <TestPipelineTable />,
            tested: "??"
        },
        {
            category    : "business",
            component   : "application",
            classname   : "ApplicationEditor",
            create      : () => <TestApplicationEditor />,
            tested: "??"
        },
        {
            category    : "business",
            component   : "pipeline_group",
            classname   : "PipelineGroupEditor",
            create      : () => <TestPipelineGroupEditor />,
            tested: "??"
        },
        {
            category    : "business",
            component   : "timer",
            classname   : "TimerTable",
            create      : () => <TestTimerTable />,
            tested: "??"
        },
    ];

    renderTestClass() {
        const testClass = _.find(
            this.testClasses,
            testClass => testClass.classname === this.props.classname
        );
        return testClass.create();
    }

    renderTableRow(idx) {
        const testClass = this.testClasses[idx];
        const componentGroupCouont = this.testClasses.filter(x => x.component === testClass.component).length;

        if ((idx === 0) || (idx > 0 && this.testClasses[idx-1].component !== testClass.component)) {
            // ret.push(
            //     <tr key={`sep-${testClass.component}`}>
            //         <td colSpan={4}></td>
            //     </tr>
            // );
            return (
                <tr key={testClass.classname}>
                    <td rowSpan={componentGroupCouont}>{testClass.category}</td>
                    <td rowSpan={componentGroupCouont}>{testClass.component}</td>
                    <td>
                        <a href={`?classname=${testClass.classname}`} target="_blank">
                            {testClass.classname}
                        </a>
                    </td>
                    <td>{testClass.tested}</td>
                </tr>
            );
        } else {
            return (
                <tr key={testClass.classname}>
                    <td>
                        <a href={`?classname=${testClass.classname}`} target="_blank">
                            {testClass.classname}
                        </a>
                    </td>
                    <td>{testClass.tested}</td>
                </tr>
            );
        }


        return ret;
    }

    renderTestList() {
        return (
            <div>
                <h1>Main Test Page</h1>
                <Table hover size="sm" className="test-table">
                    <thead className="thead-dark">
                        <tr>
                            <th data-role='category'>Category</th>
                            <th data-role='component'>Component</th>
                            <th data-role='class'>Class</th>
                            <th data-role='tested'>Tested</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            this.testClasses.map((testClass, idx) => this.renderTableRow(idx))
                        }
                    </tbody>
                </Table>
            </div>
        );
    }

    render() {
        if (this.props.classname) {
            return (
                <Container fluid>
                    {
                        this.renderTestClass()
                    }
                    <br/><br/><br/><br/>
                    <p>
                        <a href="/explorer/test">Go back</a>
                    </p>
                </Container>
            );
        } else {
            return (
                <Container fluid>
                    {
                        this.renderTestList()
                    }
                </Container>
            );
        }
    }
}

$(function() {
    const app_context = get_app_context();

    ReactDOM.render(
        <TestPage classname={app_context.classname}/>,
        document.getElementById('app')
    );
});
