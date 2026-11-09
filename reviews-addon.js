
(() => {
  'use strict';

  const SUPABASE_URL = 'https://yilqkywwmatebbejmhny.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_YheIRsETgK-gBxhgiE8HOA_KORyOMhN';

  let db;
  let reviewChannel;

  const $ = id => document.getElementById(id);

  function addReviewStyles() {
    if ($('reviewsAddonStyles')) return;

    const style = document.createElement('style');
    style.id = 'reviewsAddonStyles';

    style.textContent = `
      .visitor-review-form {
        max-width: 680px;
        margin: 25px auto 35px;
        padding: 25px;
        background: rgba(32,45,35,.92);
        border: 1px solid #6ab088;
        border-radius: 18px;
        color: #fefae0;
      }

      .visitor-review-form h3 {
        color: #e9c46a;
        margin-top: 0;
      }

      .visitor-review-field {
        margin: 15px 0;
      }

      .visitor-review-field label {
        display: block;
        margin-bottom: 7px;
      }

      .visitor-review-field input,
      .visitor-review-field textarea,
      .visitor-review-field select {
        box-sizing: border-box;
        width: 100%;
        padding: 12px;
        border: 1px solid #526b55;
        border-radius: 9px;
        background: #0d140f;
        color: white;
        font: inherit;
      }

      .visitor-review-field textarea {
        min-height: 110px;
        resize: vertical;
      }

      .visitor-review-submit {
        border: 1px solid #6ab088;
        border-radius: 10px;
        padding: 12px 20px;
        background: #294936;
        color: white;
        font: inherit;
        cursor: pointer;
        transition: .2s;
      }

      .visitor-review-submit:hover {
        background: #426b4d;
        transform: translateY(-1px);
      }

      .visitor-review-submit:disabled {
        opacity: .6;
        cursor: wait;
      }

      .visitor-review-status {
        margin-top: 12px;
        color: #c9d5bd;
      }

      .cloud-review-card {
        animation: reviewAppear .35s ease;
      }

      .cloud-review-rating {
        color: #e9c46a;
        letter-spacing: 3px;
        margin-bottom: 8px;
      }

      .cloud-review-date {
        display: block;
        margin-top: 12px;
        color: #b5c4ad;
        font-size: 12px;
      }

      @keyframes reviewAppear {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media(max-width: 600px) {
        .visitor-review-form {
          padding: 17px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createReviewForm() {
    const page = $('page-reviews');
    if (!page || $('visitorReviewForm')) return;

    const grid = page.querySelector('.reviews-grid');
    if (!grid) {
      console.error('Не найден .reviews-grid во вкладке отзывов.');
      return;
    }

    const wrapper = document.createElement('div');

    wrapper.innerHTML = `
      <form class="visitor-review-form" id="visitorReviewForm">

        <h3>✦ Оставить свой отзыв</h3>

        <p>
          Поделитесь впечатлениями о «Лавке отшельницы».
          Ваш отзыв увидят другие посетители.
        </p>

        <div class="visitor-review-field">
          <label for="visitorReviewName">Ваше имя</label>
          <input
            id="visitorReviewName"
            type="text"
            maxlength="60"
            minlength="2"
            placeholder="Как к вам обращаться?"
            required
          >
        </div>

        <div class="visitor-review-field">
          <label for="visitorReviewRating">Оценка</label>
          <select id="visitorReviewRating" required>
            <option value="5">★★★★★ — Отлично</option>
            <option value="4">★★★★☆ — Хорошо</option>
            <option value="3">★★★☆☆ — Нормально</option>
            <option value="2">★★☆☆☆ — Не очень</option>
            <option value="1">★☆☆☆☆ — Плохо</option>
          </select>
        </div>

        <div class="visitor-review-field">
          <label for="visitorReviewMessage">Ваш отзыв</label>
          <textarea
            id="visitorReviewMessage"
            minlength="5"
            maxlength="1500"
            placeholder="Напишите, что вам понравилось..."
            required
          ></textarea>
        </div>

        <button
          class="visitor-review-submit"
          id="visitorReviewSubmit"
          type="submit"
        >
          Опубликовать отзыв
        </button>

        <p
          class="visitor-review-status"
          id="visitorReviewStatus"
          role="status"
          aria-live="polite"
        ></p>

      </form>
    `;

    page.insertBefore(wrapper.firstElementChild, grid);

    $('visitorReviewForm').addEventListener('submit', submitReview);
  }

  function createReviewCard(review) {
    const card = document.createElement('div');
    card.className = 'review-card cloud-review-card';

    const rating = document.createElement('div');
    rating.className = 'cloud-review-rating';
    rating.textContent =
      '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

    const message = document.createElement('p');
    message.textContent = '«' + review.message + '»';

    const author = document.createElement('div');
    author.className = 'review-author';
    author.textContent = '— ' + review.name;

    const date = document.createElement('span');
    date.className = 'cloud-review-date';

    const parsedDate = new Date(review.created_at);

    date.textContent = Number.isNaN(parsedDate.getTime())
      ? ''
      : parsedDate.toLocaleDateString('ru-RU');

    card.append(rating, message, author, date);

    return card;
  }

  async function loadReviews() {
    const grid = $('page-reviews')?.querySelector('.reviews-grid');
    if (!grid) return;

    const { data, error } = await db
      .from('reviews')
      .select('id, name, rating, message, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка загрузки отзывов:', error);
      const status = $('visitorReviewStatus');
      if (status) status.textContent = 'Не удалось загрузить новые отзывы.';
      return;
    }

    // Убираем только динамические отзывы.
    // Три старых отзыва остаются на месте.
    grid.querySelectorAll('.cloud-review-card').forEach(card => {
      card.remove();
    });

    data.forEach(review => {
      grid.appendChild(createReviewCard(review));
    });
  }

  async function submitReview(event) {
    event.preventDefault();

    const name = $('visitorReviewName').value.trim();
    const rating = Number($('visitorReviewRating').value);
    const message = $('visitorReviewMessage').value.trim();

    const button = $('visitorReviewSubmit');
    const status = $('visitorReviewStatus');

    if (name.length < 2 || name.length > 60) {
      status.textContent = 'Имя должно содержать от 2 до 60 символов.';
      return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      status.textContent = 'Выбери оценку от 1 до 5.';
      return;
    }

    if (message.length < 5 || message.length > 1500) {
      status.textContent = 'Отзыв должен содержать от 5 до 1500 символов.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Отправляем...';
    status.textContent = '';

    try {
      const { error } = await db
        .from('reviews')
        .insert({
          name,
          rating,
          message
        });

      if (error) throw error;

      $('visitorReviewForm').reset();

      status.textContent = 'Спасибо! Ваш отзыв опубликован.';

      await loadReviews();

    } catch (error) {
      console.error('Ошибка отправки отзыва:', error);
      status.textContent = 'Не удалось отправить отзыв: ' + error.message;

    } finally {
      button.disabled = false;
      button.textContent = 'Опубликовать отзыв';
    }
  }

  async function init() {
    const page = $('page-reviews');

    if (!page) {
      console.error('Не найдена вкладка #page-reviews.');
      return;
    }

    if (!window.supabase) {
      console.error('Библиотека Supabase не загружена.');
      return;
    }

    addReviewStyles();
    createReviewForm();

    db = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'lavka-public-reviews'
        }
      }
    );

    await loadReviews();

    // Новые отзывы появляются у других посетителей автоматически.
    reviewChannel = db
      .channel('public-reviews-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews'
        },
        () => loadReviews()
      )
      .subscribe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
