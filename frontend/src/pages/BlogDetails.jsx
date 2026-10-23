import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { blogPosts } from "../data/productsData";
import { useToast } from "../context/ToastContext";

export default function BlogDetails() {
  const { slug } = useParams();
  const post = blogPosts.find((p) => p.slug === slug) || blogPosts[0];
  const { addToast } = useToast();

  const [commentData, setCommentData] = useState({ name: "", email: "", comment: "" });
  const [comments, setComments] = useState([
    {
      id: 1,
      author: "Marcus Vance",
      date: "October 19, 2026",
      text: "Incredible breakdown of product margins. Sourcing wireless accessories and chronographs through your catalog increased our quarterly net profit by 35%."
    }
  ]);

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentData.name || !commentData.comment) {
      addToast("Please fill in your name and comment.", "error");
      return;
    }
    const newComment = {
      id: Date.now(),
      author: commentData.name,
      date: "Just now",
      text: commentData.comment
    };
    setComments([...comments, newComment]);
    setCommentData({ name: "", email: "", comment: "" });
    addToast("Comment posted successfully!", "success");
  };

  const recentPosts = blogPosts.filter((p) => p.id !== post.id);

  return (
    <>
      <Breadcrumb
        title={post.title}
        links={[{ label: "Blog", to: "/blog" }, { label: post.title }]}
      />

      <div className="blog-single py-5">
        <div className="container">
          <div className="row g-5">
            {/* Main Article */}
            <div className="col-lg-8">
              <article className="bg-white p-4 p-md-5 rounded-4 shadow-sm border">
                <img
                  src={post.image}
                  alt={post.title}
                  className="img-fluid rounded-4 mb-4 w-100"
                  style={{ maxHeight: "420px", objectFit: "cover" }}
                />

                <div className="d-flex align-items-center gap-3 text-muted small mb-3">
                  <span className="badge bg-light text-dark px-3 py-2">{post.category}</span>
                  <span><i className="fa-regular fa-calendar me-1"></i> {post.date}</span>
                  <span><i className="fa-regular fa-user me-1"></i> By {post.author}</span>
                </div>

                <h1 className="h2 fw-bold mb-4">{post.title}</h1>

                <div className="article-body text-muted mb-5" style={{ lineHeight: "1.9", fontSize: "17px" }}>
                  {post.content.split("\n\n").map((para, idx) => {
                    if (para.startsWith("### ")) {
                      return <h4 key={idx} className="fw-bold text-dark mt-4 mb-3">{para.replace("### ", "")}</h4>;
                    }
                    if (para.startsWith("- **")) {
                      return (
                        <ul key={idx} className="mb-3">
                          {para.split("\n").map((item, itemIdx) => (
                            <li key={itemIdx} className="mb-2">
                              {item.replace(/^- \*\*(.*?)\*\*:/, "<strong>$1</strong>:")}
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={idx}>{para}</p>;
                  })}
                </div>

                {/* Social Share */}
                <div className="d-flex align-items-center justify-content-between border-top border-bottom py-3 mb-5">
                  <span className="fw-semibold">Share this story:</span>
                  <div className="d-flex gap-2">
                    <a href="#" className="btn btn-outline-dark btn-sm rounded-circle" style={{ width: "36px", height: "36px" }}><i className="fa-brands fa-facebook-f"></i></a>
                    <a href="#" className="btn btn-outline-dark btn-sm rounded-circle" style={{ width: "36px", height: "36px" }}><i className="fa-brands fa-x-twitter"></i></a>
                    <a href="#" className="btn btn-outline-dark btn-sm rounded-circle" style={{ width: "36px", height: "36px" }}><i className="fa-brands fa-pinterest-p"></i></a>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="comments-section mb-5">
                  <h4 className="fw-bold mb-4">Comments ({comments.length})</h4>
                  {comments.map((comm) => (
                    <div key={comm.id} className="p-3 bg-light rounded-4 mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <h6 className="fw-bold mb-0">{comm.author}</h6>
                        <span className="text-muted small">{comm.date}</span>
                      </div>
                      <p className="text-muted small mb-0">{comm.text}</p>
                    </div>
                  ))}
                </div>

                {/* Add Comment Form */}
                <div className="add-comment-box bg-light p-4 rounded-4">
                  <h5 className="fw-bold mb-3">Leave a Reply</h5>
                  <form onSubmit={handleCommentSubmit}>
                    <div className="row g-3 mb-3">
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">Your Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={commentData.name}
                          onChange={(e) => setCommentData({ ...commentData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">Your Email *</label>
                        <input
                          type="email"
                          className="form-control"
                          value={commentData.email}
                          onChange={(e) => setCommentData({ ...commentData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Comment *</label>
                      <textarea
                        className="form-control"
                        rows="4"
                        value={commentData.comment}
                        onChange={(e) => setCommentData({ ...commentData, comment: e.target.value })}
                        required
                      ></textarea>
                    </div>
                    <button type="submit" className="btn btn-dark rounded-pill px-4">
                      Submit Comment
                    </button>
                  </form>
                </div>
              </article>
            </div>

            {/* Sidebar */}
            <div className="col-lg-4">
              <div className="blog-sidebar sticky-top" style={{ top: "100px" }}>
                {/* Recent Articles */}
                <div className="bg-white p-4 rounded-4 shadow-sm border mb-4">
                  <h5 className="fw-bold mb-3">More Articles</h5>
                  {recentPosts.map((p) => (
                    <div key={p.id} className="d-flex gap-3 align-items-center mb-3 pb-3 border-bottom">
                      <img
                        src={p.image}
                        alt={p.title}
                        className="rounded-3"
                        style={{ width: "70px", height: "70px", objectFit: "cover" }}
                      />
                      <div>
                        <h6 className="mb-1" style={{ fontSize: "14px" }}>
                          <Link to={`/blog/${p.slug}`} className="text-dark text-decoration-none">
                            {p.title}
                          </Link>
                        </h6>
                        <span className="text-muted small">{p.date}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Promo Card */}
                <div
                  className="p-4 rounded-4 text-white text-center shadow-sm"
                  style={{
                    backgroundColor: "#1A1A1A",
                    backgroundImage: "url('/images/promo-offer-bg-image-1.png')",
                    backgroundSize: "cover"
                  }}
                >
                  <span className="badge bg-warning text-dark px-3 py-2 rounded-pill mb-3">Special Code</span>
                  <h4 className="fw-bold text-white mb-2">Get 20% Off</h4>
                  <p className="text-white-50 small mb-3">Use code <strong>RESELLER20</strong> at checkout on your first wholesale inventory order.</p>
                  <Link to="/shop" className="btn btn-light rounded-pill px-4 btn-sm fw-semibold">
                    Shop Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
