import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import Container from 'react-bootstrap/Container'

import {get_app_context} from '/common_lib'

import {TestAlertBox}               from '/components/generic/alert/test.jsx'
import {TestTopMessage}             from '/components/generic/top_message/test.jsx'
import {TestDataTable}              from '/components/generic/datatable/test.jsx'

import {TestDatasetEditor}          from '/components/business/dataset/test.jsx'
import {TestTimerTable}             from '/components/business/timer/test.jsx'
import {TestApplicationEditor}      from '/components/business/application/test.jsx'
import {TestPipelineGroupEditor}    from '/components/business/pipeline_group/test.jsx'
import {TestPipelineTable}          from '/components/business/pipeline/test_pipeline_table.jsx'
import {TestPipelineEditor}         from '/components/business/pipeline/test_pipeline_editor.jsx'
import {TestTaskEditor}             from '/components/business/pipeline/test_task_editor.jsx'
import {TestSQLStepEditor}          from '/components/business/pipeline/test_sql_step_editor.jsx'


class TestPage extends React.Component {
    components = {
        AlertBox: {
            create: () => <TestAlertBox />,
            category: "generic",
            tested: "2020-11-13"
        },
        TopMessage: {
            create: () => <TestTopMessage />,
            category: "generic",
            tested: "2020-11-13"
        },
        DataTable: {
            create: () => <TestDataTable />,
            category: "generic",
            tested: "2020-11-13"
        },
        DatasetEditor: {
            create: () => <TestDatasetEditor />,
            category: "business",
            tested: "2020-11-13"
        },
        SQLStepEditor: {
            create: () => <TestSQLStepEditor />,
            category: "business",
            tested: ""
        },
        TaskEditor: {
            create: () => <TestTaskEditor />,
            category: "business",
            tested: ""
        },
        PipelineEditor: {
            create: () => <TestPipelineEditor />,
            category: "business",
            tested: ""
        },
        ApplicationEditor: {
            create: () => <TestApplicationEditor />,
            category: "business",
            tested: ""
        },
        PipelineGroupEditor: {
            create: () => <TestPipelineGroupEditor />,
            category: "business",
            tested: ""
        },
        PipelineTable: {
            create: () => <TestPipelineTable />,
            category: "business",
            tested: ""
        },
        TimerTable: {
            create: () => <TestTimerTable />,
            category: "business",
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
                        {
                            ["generic", "business"].map(category =>
                                <div>
                                    <h2>{category}</h2>
                                    <table>
                                        <thead>
                                            <tr>
                                                <td style={{width: "300px"}}>Component</td>
                                                <td style={{width: "200px"}}>Tested</td>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {
                                                _.chain(_.toPairs(this.components)).filter(
                                                    ele => ele[1].category===category
                                                ).map(
                                                    ele => (
                                                        <tr key={ele[0]}>
                                                            <td>
                                                                <a
                                                                    href={`?component=${ele[0]}`}
                                                                    target="_blank"
                                                                >
                                                                    {`${ele[0]}`}
                                                                </a>
                                                            </td>
                                                            <td>
                                                                {ele[1].tested}
                                                            </td>
                                                        </tr>
                                                    )
                                                ).value()
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            )
                        }
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
