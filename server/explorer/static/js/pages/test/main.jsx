import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import {get_app_context} from '/common_lib'
import {TestTimerTable} from '/components/timer/test.jsx'
import {TestApplicationEditor} from '/components/application/test.jsx'
import {TestDatasetEditor} from '/components/dataset/test.jsx'
import {TestPipelineGroupEditor} from '/components/pipeline_group/test.jsx'

import {TestTaskEditor} from '/components/task_editor/test.jsx'
import {TestPipelineEditor} from '/components/pipeline_editor/test.jsx'
import {TestSQLStepEditor} from '/components/sql_step_editor/test.jsx'
import {TestPipelineTable} from '/components/pipeline_table/test.jsx'

class TestPage extends React.Component {
    render() {
        return (
            <div>
                { !this.props.component &&
                    <div>
                        <h1>Main Test Page</h1>
                        <ul>
                            <li><a href="?component=TaskEditor">TaskEditor</a></li>
                            <li><a href="?component=ApplicationEditor">ApplicationEditor</a></li>
                            <li><a href="?component=DatasetEditor">DatasetEditor</a></li>
                            <li><a href="?component=PipelineEditor">PipelineEditor</a></li>
                            <li><a href="?component=SQLStepEditor">SQLStepEditor</a></li>
                            <li><a href="?component=PipelineGroupEditor">PipelineGroupEditor</a></li>
                            <li><a href="?component=PipelineTable">PipelineTable</a></li>
                            <li><a href="?component=TimerTable">TimerTable</a></li>
                        </ul>
                    </div>
                }
                { this.props.component && <div><a href="?">Go back to Test Index</a></div> }
                {
                    this.props.component === "TaskEditor" && <TestTaskEditor />
                }
                {
                    this.props.component === "ApplicationEditor" && <TestApplicationEditor />
                }
                {
                    this.props.component === "DatasetEditor" && <TestDatasetEditor />
                }
                {
                    this.props.component === "PipelineEditor" && <TestPipelineEditor />
                }
                {
                    this.props.component === "SQLStepEditor" && <TestSQLStepEditor />
                }
                {
                    this.props.component === "PipelineGroupEditor" && <TestPipelineGroupEditor />
                }
                {
                    this.props.component === "PipelineTable" && <TestPipelineTable />
                }
                {
                    this.props.component === "TimerTable" && <TestTimerTable />
                }
            </div>
        )
    }
}

$(function() {
    const app_context = get_app_context();

    ReactDOM.render(
        <TestPage component={app_context.component}/>,
        document.getElementById('app')
    );
});
