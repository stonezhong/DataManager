import React from 'react'

import "./pipeline.scss"

import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import {AppIcon} from '/components/generic/icons/main.jsx'
import {ApplicationLink} from '/components/business/application'

/*********************************************************************************
 * Purpose: View a pipeline
 *
 * Props
 *     applications_by_id: object, key is application id, value is application model
 *                         these are applications being referenced in this pipeline
 *
 *     pipeline          : pipeline model
 *
 */
export class PipelineViewer extends React.Component {
    render_dummy_task(task, ctx) {
        return (
            <div>
                <table className="pipeline-task-info-grid">
                    <tbody>
                        <tr>
                            <td>Type</td>
                            <td>Dummy</td>
                        </tr>
                        <tr>
                            <td>Description</td>
                            <td>
                                {task.description}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    render_spaqk_sql_task_step_output(task, ctx, step, output) {
        return (
            <div>
                <h4>Output</h4>
                <table className="pipeline-task-info-grid">
                    <tbody>
                        <tr>
                            <td>Location</td>
                            <td>{output.location}</td>
                        </tr>
                        <tr>
                            <td>Type</td>
                            <td>{output.type}</td>
                        </tr>
                        <tr>
                            <td>Mode</td>
                            <td>{output.write_mode}</td>
                        </tr>
                        <tr>
                            <td>As asset</td>
                            <td>
                                {output.register_dataset_instance}
                            </td>
                        </tr>
                        <tr>
                            <td>Data Time</td>
                            <td>
                                {output.data_time}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    render_spark_sql_task_step(task, ctx, step) {
        return (
            <Card key={step.name} border="success" className="mt-2 step_panel">
                <Card.Header as="h3">{step.name}</Card.Header>
                <Card.Body>
                    <div className="step_content_section">
                    { step.imports.map(imp =>
                        <div>import asset {imp.dsi_name} as {imp.alias}</div>
                    ) }

                        <div>Execute SQL Query:</div>
                        <pre className="ml-2">
                            {step.sql}
                        </pre>

                        {
                            step.alias && <div>
                                export query result as {step.alias}
                            </div>
                        }

                    </div>

                    {
                        ("output" in step) && this.render_spaqk_sql_task_step_output(task, ctx, step, step.output)
                    }
                </Card.Body>
            </Card>
        );
    }

    render_spark_sql_task(task, ctx) {
        return (
            <div>
                <table className="pipeline-task-info-grid">
                    <tbody>
                        <tr>
                            <td>Type</td>
                            <td>Spark-SQL</td>
                        </tr>
                        <tr>
                            <td>Description</td>
                            <td>
                                {task.description}
                            </td>
                        </tr>
                    </tbody>
                </table>

                { task.steps.map(step => this.render_spark_sql_task_step(task, ctx, step)) }
            </div>
        );
    }

    render_application_task(task, ctx) {
        const application = this.props.applications_by_id[task.application_id];
        return (
            <div>
                <table className="pipeline-task-info-grid">
                    <tbody>
                        <tr>
                            <td>Type</td>
                            <td>Application</td>
                        </tr>
                        <tr>
                            <td>Description</td>
                            <td>
                                {task.description}
                            </td>
                        </tr>
                        <tr>
                            <td>Application</td>
                            <td>
                                <ApplicationLink application={application}/>
                            </td>
                        </tr>
                        <tr>
                            <td>Arguments</td>
                            <td>
                                <pre>
                                    { JSON.stringify(JSON.parse(task.args),null,2) }
                                </pre>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }


    render_task(task, ctx) {
        return (
            <Row className="mt-2" key={task.name} id={`task-${task.name}`}>
                <Col>
                    <Card border="success">
                        <Card.Header as="h2">{task.name}</Card.Header>
                        <Card.Body>
                            {
                                task.type==="dummy" && this.render_dummy_task(task, ctx)
                            }
                            {
                                task.type==="other" && this.render_application_task(task, ctx)
                            }
                            {
                                task.type==="spark-sql" && this.render_spark_sql_task(task, ctx)
                            }
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        );
    }

    render() {
        const ctx = JSON.parse(this.props.pipeline.context);
        return (
            <div>
                <table className="pipeline-basic-attribute-grid mb-2">
                    <tbody>
                        <tr>
                            <td>Name</td>
                            <td>{this.props.pipeline.name}</td>
                        </tr>
                        <tr>
                            <td>Author</td>
                            <td>{this.props.pipeline.author}</td>
                        </tr>
                        <tr>
                            <td>Team</td>
                            <td>{this.props.pipeline.team}</td>
                        </tr>
                        <tr>
                            <td>Category</td>
                            <td>{this.props.pipeline.category}</td>
                        </tr>
                        <tr>
                            <td>Active</td>
                            <td>
                                <AppIcon type={this.props.pipeline.paused?"dismiss":"checkmark"} className="icon16" />
                                <span className="ml-2">{this.props.pipeline.paused?"Paused": "Active"}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>In Service</td>
                            <td>
                                <AppIcon type={this.props.pipeline.retired?"dismiss":"checkmark"} className="icon16" />
                                <span className="ml-2">{this.props.pipeline.retired?"Retired":"In Service"}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>Type</td>
                            <td>
                                {ctx.type}
                            </td>
                        </tr>
                        <tr>
                            <td>Required Assets</td>
                            <td>
                                {ctx.requiredDSIs.map(dsi_path => <div key={dsi_path}>{dsi_path}</div>)}
                            </td>
                        </tr>

                    </tbody>
                </table>

                {
                    (ctx.type === 'simple-flow') && <div>
                        <h2>Tasks</h2>
                        <ul>
                        { ctx.tasks.map(task => <li><a href={`#task-${task.name}`}>{task.name}</a></li>) }
                        </ul>
                    </div>
                }

                {
                    (ctx.type === 'simple-flow') && ctx.tasks.map(task => this.render_task(task, ctx))
                }
            </div>
        );
    }
}
