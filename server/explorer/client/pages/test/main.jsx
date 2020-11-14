import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import Container from 'react-bootstrap/Container'

import {get_app_context} from '/common_lib'

import {TestAlertBox}               from '/components/generic/alert/test.jsx'
import {TestTopMessage}             from '/components/generic/top_message/test.jsx'

import {TestTimerTable}             from '/components/timer/test.jsx'
import {TestApplicationEditor}      from '/components/application/test.jsx'
import {TestDatasetEditor}          from '/components/dataset/test.jsx'
import {TestPipelineGroupEditor}    from '/components/pipeline_group/test.jsx'
import {TestPipelineTable}          from '/components/pipeline/test_pipeline_table.jsx'
import {TestPipelineEditor}         from '/components/pipeline/test_pipeline_editor.jsx'
import {TestTaskEditor}             from '/components/pipeline/test_task_editor.jsx'
import {TestSQLStepEditor}          from '/components/pipeline/test_sql_step_editor.jsx'


class TestPage extends React.Component {
    components = {
        AlertBox: {
            create: () => <TestAlertBox />,
            tested: "2020-11-13"
        },
        TopMessage: {
            create: () => <TestTopMessage />,
            tested: "2020-11-13"
        },
        DatasetEditor: {
            create: () => <TestDatasetEditor />,
            tested: "2020-11-13"
        },
        SQLStepEditor: {
            create: () => <TestSQLStepEditor />,
            tested: ""
        },
        TaskEditor: {
            create: () => <TestTaskEditor />,
            tested: ""
        },
        PipelineEditor: {
            create: () => <TestPipelineEditor />,
            tested: ""
        },
        ApplicationEditor: {
            create: () => <TestApplicationEditor />,
            tested: ""
        },
        PipelineGroupEditor: {
            create: () => <TestPipelineGroupEditor />,
            tested: ""
        },
        PipelineTable: {
            create: () => <TestPipelineTable />,
            tested: ""
        },
        TimerTable: {
            create: () => <TestTimerTable />,
            tested: ""
        },
    };

    renderComponent = () => {
        const component = this.components[this.props.component];
        if (_.isUndefined(component)) {
            return null;
        }
        return component.create();
    };

    render() {
        return (
            <Container fluid>
                { !this.props.component &&
                    <div>
                        <h1>Main Test Page</h1>
                        <table>
                            <thead>
                                <tr>
                                    <td style={{width: "300px"}}>Component</td>
                                    <td style={{width: "200px"}}>Tested</td>
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    _.map(this.components,
                                        (value, component) => (
                                            <tr key={component}>
                                                <td>
                                                    <a
                                                        href={`?component=${component}`}
                                                        target="_blank"
                                                    >
                                                        {`${component}`}
                                                    </a>
                                                </td>
                                                <td>
                                                    {value.tested}
                                                </td>
                                            </tr>
                                        )
                                    )
                                }
                            </tbody>
                        </table>
                    </div>
                }
                {
                    this.renderComponent()
                }
            </Container>
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
